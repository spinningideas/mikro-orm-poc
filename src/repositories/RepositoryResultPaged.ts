/**
 * @summary Generic paginated result for repositories that allows decoupling
 * from Sequelize Models directly within persistence related methods.
 * Returns indicator if the operation was successful in the boolean "success".
 * Returns the actual payload of data in "data" having type specified in DataType.
 * Returns any errors in "errors" having type specified in ErrorType.
 */
export class RepositoryResultPaged<DataType, ErrorType> {
  public success: boolean;
  public error: ErrorType;
  public data: DataType;
  public currentPage: number;
  public totalRows: number;
  public totalItems: number;

  private constructor(
    success: boolean,
    data: DataType,
    error: ErrorType,
    currentPage: number,
    totalRows: number,
    totalItems: number
  ) {
    if (success && error) {
      throw new Error("Successful result must not contain an error");
    } else if (!error) {
      throw new Error("Unsuccessful result must contain an error");
    }

    this.success = success;
    this.data = data;
    this.error = error;
    this.currentPage = currentPage;
    this.totalRows = totalRows;
    this.totalItems = totalItems;
  }

  public static ok<DataType>(
    data: DataType,
    currentPage: number,
    totalRows: number,
    totalItems: number
  ): RepositoryResultPaged<DataType, undefined> {
    return new RepositoryResultPaged(
      true,
      data,
      undefined,
      currentPage,
      totalRows,
      totalItems
    );
  }

  public static fail<ErrorType>(
    error: ErrorType,
    currentPage: number,
    totalRows: number,
    totalItems: number
  ): RepositoryResultPaged<undefined, ErrorType> {
    return new RepositoryResultPaged(
      false,
      undefined,
      error,
      currentPage,
      totalRows,
      totalItems
    );
  }

  public getError(): ErrorType {
    if (!this.error) {
      throw new Error("Result does not contain an error");
    }
    return this.error;
  }

  public getData(): DataType {
    if (!this.data) {
      throw new Error("Result does not contain data");
    }
    return this.data;
  }
}

export default RepositoryResultPaged;
