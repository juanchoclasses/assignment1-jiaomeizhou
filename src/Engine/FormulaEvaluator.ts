import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";
import { IndentStyle } from "typescript";



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;


  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

  /**w
    * place holder for the evaluator.   I am not sure what the type of the formula is yet 
    * I do know that there will be a list of tokens so i will return the length of the array
    * 
    * I also need to test the error display in the front end so i will set the error message to
    * the error messages found In GlobalDefinitions.ts
    * 
    * according to this formula.
    * 
    7 tokens partial: "#ERR",
    8 tokens divideByZero: "#DIV/0!",
    9 tokens invalidCell: "#REF!",
  10 tokens invalidFormula: "#ERR",
  11 tokens invalidNumber: "#ERR",
  12 tokens invalidOperator: "#ERR",
  13 missingParentheses: "#ERR",
  0 tokens emptyFormula: "#EMPTY!",

                    When i get back from my quest to save the world from the evil thing i will fix.
                      (if you are in a hurry you can fix it yourself)
                               Sincerely 
                               Bilbo
    * 
   */

  evaluate(formula: FormulaType) {
    this._result = 0;
    this._errorMessage = "";

      // If the formula is empty, return "".
      if (formula.length === 0) {
        this._errorMessage = ErrorMessages.emptyFormula;
        return; // Exit the method to prevent further execution
      }

      // If the formula is not empty, evaluate the tokens and return the result
      this.evaluateTokens(formula);
  }

  // evaluate the tokens and return the result
  private evaluateTokens(tokens: FormulaType) {

    const numbers: number[] = [];
    const operators: string[] = [];

    // loop through the tokens
    for (const token of tokens) {

      // if the token is a number, push it to the number stack
      if (this.isNumber(token)) {
        numbers.push(Number(token));
      } 

      // if the token is a cell reference, push the cell value to the number stack
      else if (this.isCellReference(token)) {
        const [value, error] = this.getCellValue(token);
        if (error !== "") {
          this._errorMessage = error;
          break;
        }
        numbers.push(value);
      } 

      // if the token is an operator, apply the operator to the top two numbers in the stack
      else if (this.isOperator(token)) {
        while (
          operators.length > 0 &&
          this.hasHigherPrecedence(operators[operators.length - 1], token)
        ) {
          this.applyOperator(numbers, operators.pop() as string);
        }
        operators.push(token);
      } 

      // if the token is a left parenthesis, push it to the operator stack
      else if (token === "(") {
        operators.push(token);
      } 

      // if the token is a right parenthesis, apply the operators until the left parenthesis is found
      else if (token === ")") {
        // while the operator stack is not empty and the top of the stack is not a left parenthesis
        while (operators.length > 0 && operators[operators.length - 1] !== "(") {
          this.applyOperator(numbers, operators.pop() as string);
        }
        // if the operator stack is empty or the top of the stack is not a left parenthesis, throw an error
        if (operators.length === 0) {
          this._errorMessage = ErrorMessages.missingParentheses;
        }
        else {
          operators.pop(); // pop the left parenthesis
        }
      }
    }

    while (operators.length > 0) {
      this.applyOperator(numbers, operators.pop() as string);
    }

    if (numbers.length === 1) {
      this._result = numbers[0];
    }
    else if (numbers.length === 0 && this._errorMessage === "") {
      this._result = 0;
      this._errorMessage = ErrorMessages.invalidFormula;
    }
  }

  // check if the token is an operator
  private isOperator(token: TokenType): boolean {
    return ["+", "-", "*", "/"].includes(token);
  }

  // check if the operator1 has higher precedence than operator2
  private hasHigherPrecedence(operator1: string, operator2: string): boolean {
    const precedence: { [operator: string]: number } = { "+": 1, "-": 1, "*": 2, "/": 2 };
    return precedence[operator1] >= precedence[operator2];
  }

  // apply the operator to the top two numbers in the stack
  private applyOperator(stack: number[], operator: string): void {
    if (stack.length === 0) {
      this._errorMessage = ErrorMessages.invalidFormula;
      return;
    }
    // if the stack has less than two numbers, throw an error
    if (stack.length < 2) {
      this._errorMessage = ErrorMessages.invalidFormula;
      this._result = stack.pop() as number;
      // stack.pop(); // pop the last number from the stack
      return;
    }
    // pop the top two numbers from the stack
    const operand2 = stack.pop() as number;
    const operand1 = stack.pop() as number;

    // apply the operator to the two numbers and push the result to the stack
    switch (operator) {
      case "+":
        stack.push(operand1 + operand2);
        break;
      case "-":
        stack.push(operand1 - operand2);
        break;
      case "*":
        stack.push(operand1 * operand2);
        break;
      case "/":
        stack.push(operand1 / operand2);
        if (operand2 === 0) {
          this._errorMessage = ErrorMessages.divideByZero;
        }
        break;
      default:
        throw new Error(ErrorMessages.invalidOperator);
    }
  }

  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }




  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;