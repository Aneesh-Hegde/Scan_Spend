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

  getUserId(): string;
  setUserId(value: string): Balance;

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
    userId: string,
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
  getUserId(): number;
  setUserId(value: number): AddBalanceSourceRequest;

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
    userId: number,
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

