import * as jspb from 'google-protobuf'



export class GetBalanceRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetBalanceRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetBalanceRequest): GetBalanceRequest.AsObject;
  static serializeBinaryToWriter(message: GetBalanceRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetBalanceRequest;
  static deserializeBinaryFromReader(message: GetBalanceRequest, reader: jspb.BinaryReader): GetBalanceRequest;
}

export namespace GetBalanceRequest {
  export type AsObject = {
  }
}

export class Balance extends jspb.Message {
  getBalanceId(): number;
  setBalanceId(value: number): Balance;

  getBalanceSource(): string;
  setBalanceSource(value: string): Balance;

  getBalanceAmount(): string;
  setBalanceAmount(value: string): Balance;

  getBalance(): number;
  setBalance(value: number): Balance;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Balance.AsObject;
  static toObject(includeInstance: boolean, msg: Balance): Balance.AsObject;
  static serializeBinaryToWriter(message: Balance, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Balance;
  static deserializeBinaryFromReader(message: Balance, reader: jspb.BinaryReader): Balance;
}

export namespace Balance {
  export type AsObject = {
    balanceId: number,
    balanceSource: string,
    balanceAmount: string,
    balance: number,
  }
}

export class GetBalanceResponse extends jspb.Message {
  getBalanceList(): Array<Balance>;
  setBalanceList(value: Array<Balance>): GetBalanceResponse;
  clearBalanceList(): GetBalanceResponse;
  addBalance(value?: Balance, index?: number): Balance;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetBalanceResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetBalanceResponse): GetBalanceResponse.AsObject;
  static serializeBinaryToWriter(message: GetBalanceResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetBalanceResponse;
  static deserializeBinaryFromReader(message: GetBalanceResponse, reader: jspb.BinaryReader): GetBalanceResponse;
}

export namespace GetBalanceResponse {
  export type AsObject = {
    balanceList: Array<Balance.AsObject>,
  }
}

export class AddBalanceSourceRequest extends jspb.Message {
  getBalanceSource(): string;
  setBalanceSource(value: string): AddBalanceSourceRequest;

  getInitialAmount(): number;
  setInitialAmount(value: number): AddBalanceSourceRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AddBalanceSourceRequest.AsObject;
  static toObject(includeInstance: boolean, msg: AddBalanceSourceRequest): AddBalanceSourceRequest.AsObject;
  static serializeBinaryToWriter(message: AddBalanceSourceRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AddBalanceSourceRequest;
  static deserializeBinaryFromReader(message: AddBalanceSourceRequest, reader: jspb.BinaryReader): AddBalanceSourceRequest;
}

export namespace AddBalanceSourceRequest {
  export type AsObject = {
    balanceSource: string,
    initialAmount: number,
  }
}

export class AddBalanceSourceResponse extends jspb.Message {
  getBalance(): Balance | undefined;
  setBalance(value?: Balance): AddBalanceSourceResponse;
  hasBalance(): boolean;
  clearBalance(): AddBalanceSourceResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AddBalanceSourceResponse.AsObject;
  static toObject(includeInstance: boolean, msg: AddBalanceSourceResponse): AddBalanceSourceResponse.AsObject;
  static serializeBinaryToWriter(message: AddBalanceSourceResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AddBalanceSourceResponse;
  static deserializeBinaryFromReader(message: AddBalanceSourceResponse, reader: jspb.BinaryReader): AddBalanceSourceResponse;
}

export namespace AddBalanceSourceResponse {
  export type AsObject = {
    balance?: Balance.AsObject,
  }
}

export class UpdateBalanceRequest extends jspb.Message {
  getBalanceId(): number;
  setBalanceId(value: number): UpdateBalanceRequest;

  getAmount(): number;
  setAmount(value: number): UpdateBalanceRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateBalanceRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateBalanceRequest): UpdateBalanceRequest.AsObject;
  static serializeBinaryToWriter(message: UpdateBalanceRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateBalanceRequest;
  static deserializeBinaryFromReader(message: UpdateBalanceRequest, reader: jspb.BinaryReader): UpdateBalanceRequest;
}

export namespace UpdateBalanceRequest {
  export type AsObject = {
    balanceId: number,
    amount: number,
  }
}

export class UpdateBalanceResponse extends jspb.Message {
  getBalance(): Balance | undefined;
  setBalance(value?: Balance): UpdateBalanceResponse;
  hasBalance(): boolean;
  clearBalance(): UpdateBalanceResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateBalanceResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateBalanceResponse): UpdateBalanceResponse.AsObject;
  static serializeBinaryToWriter(message: UpdateBalanceResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateBalanceResponse;
  static deserializeBinaryFromReader(message: UpdateBalanceResponse, reader: jspb.BinaryReader): UpdateBalanceResponse;
}

export namespace UpdateBalanceResponse {
  export type AsObject = {
    balance?: Balance.AsObject,
  }
}

export class GetTransferRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetTransferRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetTransferRequest): GetTransferRequest.AsObject;
  static serializeBinaryToWriter(message: GetTransferRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetTransferRequest;
  static deserializeBinaryFromReader(message: GetTransferRequest, reader: jspb.BinaryReader): GetTransferRequest;
}

export namespace GetTransferRequest {
  export type AsObject = {
  }
}

export class GetTransferResponse extends jspb.Message {
  getTransfersList(): Array<TransferFunds>;
  setTransfersList(value: Array<TransferFunds>): GetTransferResponse;
  clearTransfersList(): GetTransferResponse;
  addTransfers(value?: TransferFunds, index?: number): TransferFunds;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetTransferResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetTransferResponse): GetTransferResponse.AsObject;
  static serializeBinaryToWriter(message: GetTransferResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetTransferResponse;
  static deserializeBinaryFromReader(message: GetTransferResponse, reader: jspb.BinaryReader): GetTransferResponse;
}

export namespace GetTransferResponse {
  export type AsObject = {
    transfersList: Array<TransferFunds.AsObject>,
  }
}

export class TransferFunds extends jspb.Message {
  getTransferId(): number;
  setTransferId(value: number): TransferFunds;

  getFromSource(): string;
  setFromSource(value: string): TransferFunds;

  getToSource(): string;
  setToSource(value: string): TransferFunds;

  getAmount(): number;
  setAmount(value: number): TransferFunds;

  getDate(): string;
  setDate(value: string): TransferFunds;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TransferFunds.AsObject;
  static toObject(includeInstance: boolean, msg: TransferFunds): TransferFunds.AsObject;
  static serializeBinaryToWriter(message: TransferFunds, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TransferFunds;
  static deserializeBinaryFromReader(message: TransferFunds, reader: jspb.BinaryReader): TransferFunds;
}

export namespace TransferFunds {
  export type AsObject = {
    transferId: number,
    fromSource: string,
    toSource: string,
    amount: number,
    date: string,
  }
}

export class TransferFundsResponse extends jspb.Message {
  getTransactionId(): number;
  setTransactionId(value: number): TransferFundsResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TransferFundsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: TransferFundsResponse): TransferFundsResponse.AsObject;
  static serializeBinaryToWriter(message: TransferFundsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TransferFundsResponse;
  static deserializeBinaryFromReader(message: TransferFundsResponse, reader: jspb.BinaryReader): TransferFundsResponse;
}

export namespace TransferFundsResponse {
  export type AsObject = {
    transactionId: number,
  }
}

export class GetIncomeRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetIncomeRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetIncomeRequest): GetIncomeRequest.AsObject;
  static serializeBinaryToWriter(message: GetIncomeRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetIncomeRequest;
  static deserializeBinaryFromReader(message: GetIncomeRequest, reader: jspb.BinaryReader): GetIncomeRequest;
}

export namespace GetIncomeRequest {
  export type AsObject = {
  }
}

export class Income extends jspb.Message {
  getIncomeId(): number;
  setIncomeId(value: number): Income;

  getIncomeSource(): string;
  setIncomeSource(value: string): Income;

  getIncomeAmount(): string;
  setIncomeAmount(value: string): Income;

  getIncome(): number;
  setIncome(value: number): Income;

  getDate(): string;
  setDate(value: string): Income;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Income.AsObject;
  static toObject(includeInstance: boolean, msg: Income): Income.AsObject;
  static serializeBinaryToWriter(message: Income, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Income;
  static deserializeBinaryFromReader(message: Income, reader: jspb.BinaryReader): Income;
}

export namespace Income {
  export type AsObject = {
    incomeId: number,
    incomeSource: string,
    incomeAmount: string,
    income: number,
    date: string,
  }
}

export class GetIncomeResponse extends jspb.Message {
  getIncomeList(): Array<Income>;
  setIncomeList(value: Array<Income>): GetIncomeResponse;
  clearIncomeList(): GetIncomeResponse;
  addIncome(value?: Income, index?: number): Income;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetIncomeResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetIncomeResponse): GetIncomeResponse.AsObject;
  static serializeBinaryToWriter(message: GetIncomeResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetIncomeResponse;
  static deserializeBinaryFromReader(message: GetIncomeResponse, reader: jspb.BinaryReader): GetIncomeResponse;
}

export namespace GetIncomeResponse {
  export type AsObject = {
    incomeList: Array<Income.AsObject>,
  }
}

export class AddIncomeSourceRequest extends jspb.Message {
  getIncomeSource(): string;
  setIncomeSource(value: string): AddIncomeSourceRequest;

  getInitialAmount(): number;
  setInitialAmount(value: number): AddIncomeSourceRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AddIncomeSourceRequest.AsObject;
  static toObject(includeInstance: boolean, msg: AddIncomeSourceRequest): AddIncomeSourceRequest.AsObject;
  static serializeBinaryToWriter(message: AddIncomeSourceRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AddIncomeSourceRequest;
  static deserializeBinaryFromReader(message: AddIncomeSourceRequest, reader: jspb.BinaryReader): AddIncomeSourceRequest;
}

export namespace AddIncomeSourceRequest {
  export type AsObject = {
    incomeSource: string,
    initialAmount: number,
  }
}

export class AddIncomeSourceResponse extends jspb.Message {
  getIncome(): Income | undefined;
  setIncome(value?: Income): AddIncomeSourceResponse;
  hasIncome(): boolean;
  clearIncome(): AddIncomeSourceResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AddIncomeSourceResponse.AsObject;
  static toObject(includeInstance: boolean, msg: AddIncomeSourceResponse): AddIncomeSourceResponse.AsObject;
  static serializeBinaryToWriter(message: AddIncomeSourceResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AddIncomeSourceResponse;
  static deserializeBinaryFromReader(message: AddIncomeSourceResponse, reader: jspb.BinaryReader): AddIncomeSourceResponse;
}

export namespace AddIncomeSourceResponse {
  export type AsObject = {
    income?: Income.AsObject,
  }
}

export class UpdateIncomeRequest extends jspb.Message {
  getIncomeId(): number;
  setIncomeId(value: number): UpdateIncomeRequest;

  getAmount(): number;
  setAmount(value: number): UpdateIncomeRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateIncomeRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateIncomeRequest): UpdateIncomeRequest.AsObject;
  static serializeBinaryToWriter(message: UpdateIncomeRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateIncomeRequest;
  static deserializeBinaryFromReader(message: UpdateIncomeRequest, reader: jspb.BinaryReader): UpdateIncomeRequest;
}

export namespace UpdateIncomeRequest {
  export type AsObject = {
    incomeId: number,
    amount: number,
  }
}

export class UpdateIncomeResponse extends jspb.Message {
  getIncome(): Income | undefined;
  setIncome(value?: Income): UpdateIncomeResponse;
  hasIncome(): boolean;
  clearIncome(): UpdateIncomeResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateIncomeResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateIncomeResponse): UpdateIncomeResponse.AsObject;
  static serializeBinaryToWriter(message: UpdateIncomeResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateIncomeResponse;
  static deserializeBinaryFromReader(message: UpdateIncomeResponse, reader: jspb.BinaryReader): UpdateIncomeResponse;
}

export namespace UpdateIncomeResponse {
  export type AsObject = {
    income?: Income.AsObject,
  }
}

