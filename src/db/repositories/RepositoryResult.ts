/**
 * @summary Promise of Generic result from a given repository operation
 * that allows decoupling from database Models directly
 * within persistence related methods.
 */
type RepositoryResult<DataType> = Promise<
  Result<DataType | undefined, Error | undefined>
>;

/**
 * @summary Generic result for repositories that allows decoupling
 * from database Models directly within persistence related methods.
 * Returns indicator if the operation was successful in the boolean "success".
 * Returns the actual payload of data in "data" having type specified in DataType.
 * Returns any errors in "errors" having type specified in ErrorType.
 */
export class Result<DataType, ErrorType> {
  public success: boolean;
  private errors: ErrorType | string;
  private data: DataType;

  private constructor(success: boolean, data: DataType, error: ErrorType) {
    if (success && error) {
      throw new Error("Successful result must not contain an error");
    } else if (!error) {
      throw new Error("Unsuccessful result must contain an error");
    }

    this.success = success;
    this.data = data;
    this.errors = error;
  }

  public static ok<DataType>(data: DataType): Result<DataType, undefined> {
    return new Result(true, data, undefined);
  }

  public static fail<ErrorType>(
    error: ErrorType
  ): Result<undefined, ErrorType> {
    return new Result(false, undefined, error);
  }

  public getErrors(): ErrorType | string {
    if (!this.errors) {
      throw new Error("Result does not contain an error");
    }
    return this.errors;
  }

  public getData(): DataType {
    if (!this.data) {
      throw new Error("Result does not contain data");
    }

    return this.data;
  }
}

export default RepositoryResult;
