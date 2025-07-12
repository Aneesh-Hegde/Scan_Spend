import * as jspb from 'google-protobuf'



export class Goals extends jspb.Message {
  getId(): string;
  setId(value: string): Goals;

  getName(): string;
  setName(value: string): Goals;

  getTargetamount(): number;
  setTargetamount(value: number): Goals;

  getCurrentamount(): number;
  setCurrentamount(value: number): Goals;

  getDeadline(): string;
  setDeadline(value: string): Goals;

  getDescription(): string;
  setDescription(value: string): Goals;

  getCreatedat(): string;
  setCreatedat(value: string): Goals;

  getCategoryId(): string;
  setCategoryId(value: string): Goals;

  getCategoryName(): string;
  setCategoryName(value: string): Goals;

  getHexcode(): string;
  setHexcode(value: string): Goals;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Goals.AsObject;
  static toObject(includeInstance: boolean, msg: Goals): Goals.AsObject;
  static serializeBinaryToWriter(message: Goals, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Goals;
  static deserializeBinaryFromReader(message: Goals, reader: jspb.BinaryReader): Goals;
}

export namespace Goals {
  export type AsObject = {
    id: string,
    name: string,
    targetamount: number,
    currentamount: number,
    deadline: string,
    description: string,
    createdat: string,
    categoryId: string,
    categoryName: string,
    hexcode: string,
  }
}

export class GetGoalRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetGoalRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetGoalRequest): GetGoalRequest.AsObject;
  static serializeBinaryToWriter(message: GetGoalRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetGoalRequest;
  static deserializeBinaryFromReader(message: GetGoalRequest, reader: jspb.BinaryReader): GetGoalRequest;
}

export namespace GetGoalRequest {
  export type AsObject = {
  }
}

export class GetGoalResponse extends jspb.Message {
  getGoalsList(): Array<Goals>;
  setGoalsList(value: Array<Goals>): GetGoalResponse;
  clearGoalsList(): GetGoalResponse;
  addGoals(value?: Goals, index?: number): Goals;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetGoalResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetGoalResponse): GetGoalResponse.AsObject;
  static serializeBinaryToWriter(message: GetGoalResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetGoalResponse;
  static deserializeBinaryFromReader(message: GetGoalResponse, reader: jspb.BinaryReader): GetGoalResponse;
}

export namespace GetGoalResponse {
  export type AsObject = {
    goalsList: Array<Goals.AsObject>,
  }
}

export class CreateGoalRequest extends jspb.Message {
  getName(): string;
  setName(value: string): CreateGoalRequest;

  getTargetamount(): number;
  setTargetamount(value: number): CreateGoalRequest;

  getCurrentamount(): number;
  setCurrentamount(value: number): CreateGoalRequest;

  getDeadline(): string;
  setDeadline(value: string): CreateGoalRequest;

  getDescription(): string;
  setDescription(value: string): CreateGoalRequest;

  getCreatedat(): string;
  setCreatedat(value: string): CreateGoalRequest;

  getCategoryId(): string;
  setCategoryId(value: string): CreateGoalRequest;

  getCategoryName(): string;
  setCategoryName(value: string): CreateGoalRequest;

  getHexacode(): string;
  setHexacode(value: string): CreateGoalRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateGoalRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CreateGoalRequest): CreateGoalRequest.AsObject;
  static serializeBinaryToWriter(message: CreateGoalRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateGoalRequest;
  static deserializeBinaryFromReader(message: CreateGoalRequest, reader: jspb.BinaryReader): CreateGoalRequest;
}

export namespace CreateGoalRequest {
  export type AsObject = {
    name: string,
    targetamount: number,
    currentamount: number,
    deadline: string,
    description: string,
    createdat: string,
    categoryId: string,
    categoryName: string,
    hexacode: string,
  }
}

export class CreateGoalResponse extends jspb.Message {
  getId(): string;
  setId(value: string): CreateGoalResponse;

  getMessage(): string;
  setMessage(value: string): CreateGoalResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateGoalResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CreateGoalResponse): CreateGoalResponse.AsObject;
  static serializeBinaryToWriter(message: CreateGoalResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateGoalResponse;
  static deserializeBinaryFromReader(message: CreateGoalResponse, reader: jspb.BinaryReader): CreateGoalResponse;
}

export namespace CreateGoalResponse {
  export type AsObject = {
    id: string,
    message: string,
  }
}

export class UpdateGoalRequest extends jspb.Message {
  getId(): string;
  setId(value: string): UpdateGoalRequest;

  getAmount(): number;
  setAmount(value: number): UpdateGoalRequest;

  getBalanceId(): number;
  setBalanceId(value: number): UpdateGoalRequest;

  getTransactionType(): string;
  setTransactionType(value: string): UpdateGoalRequest;

  getNotes(): string;
  setNotes(value: string): UpdateGoalRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateGoalRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateGoalRequest): UpdateGoalRequest.AsObject;
  static serializeBinaryToWriter(message: UpdateGoalRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateGoalRequest;
  static deserializeBinaryFromReader(message: UpdateGoalRequest, reader: jspb.BinaryReader): UpdateGoalRequest;
}

export namespace UpdateGoalRequest {
  export type AsObject = {
    id: string,
    amount: number,
    balanceId: number,
    transactionType: string,
    notes: string,
  }
}

export class UpdateResponse extends jspb.Message {
  getMessage(): string;
  setMessage(value: string): UpdateResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateResponse): UpdateResponse.AsObject;
  static serializeBinaryToWriter(message: UpdateResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateResponse;
  static deserializeBinaryFromReader(message: UpdateResponse, reader: jspb.BinaryReader): UpdateResponse;
}

export namespace UpdateResponse {
  export type AsObject = {
    message: string,
  }
}

export class EditGoalRequest extends jspb.Message {
  getGoal(): Goals | undefined;
  setGoal(value?: Goals): EditGoalRequest;
  hasGoal(): boolean;
  clearGoal(): EditGoalRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EditGoalRequest.AsObject;
  static toObject(includeInstance: boolean, msg: EditGoalRequest): EditGoalRequest.AsObject;
  static serializeBinaryToWriter(message: EditGoalRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EditGoalRequest;
  static deserializeBinaryFromReader(message: EditGoalRequest, reader: jspb.BinaryReader): EditGoalRequest;
}

export namespace EditGoalRequest {
  export type AsObject = {
    goal?: Goals.AsObject,
  }
}

export class EditResponse extends jspb.Message {
  getMessage(): string;
  setMessage(value: string): EditResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EditResponse.AsObject;
  static toObject(includeInstance: boolean, msg: EditResponse): EditResponse.AsObject;
  static serializeBinaryToWriter(message: EditResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EditResponse;
  static deserializeBinaryFromReader(message: EditResponse, reader: jspb.BinaryReader): EditResponse;
}

export namespace EditResponse {
  export type AsObject = {
    message: string,
  }
}

export class DeleteGoalRequest extends jspb.Message {
  getId(): string;
  setId(value: string): DeleteGoalRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteGoalRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteGoalRequest): DeleteGoalRequest.AsObject;
  static serializeBinaryToWriter(message: DeleteGoalRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteGoalRequest;
  static deserializeBinaryFromReader(message: DeleteGoalRequest, reader: jspb.BinaryReader): DeleteGoalRequest;
}

export namespace DeleteGoalRequest {
  export type AsObject = {
    id: string,
  }
}

export class DeleteResponse extends jspb.Message {
  getMessage(): string;
  setMessage(value: string): DeleteResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteResponse.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteResponse): DeleteResponse.AsObject;
  static serializeBinaryToWriter(message: DeleteResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteResponse;
  static deserializeBinaryFromReader(message: DeleteResponse, reader: jspb.BinaryReader): DeleteResponse;
}

export namespace DeleteResponse {
  export type AsObject = {
    message: string,
  }
}

export class GoalTransaction extends jspb.Message {
  getId(): number;
  setId(value: number): GoalTransaction;

  getGoalId(): string;
  setGoalId(value: string): GoalTransaction;

  getBalanceId(): number;
  setBalanceId(value: number): GoalTransaction;

  getAmount(): number;
  setAmount(value: number): GoalTransaction;

  getTransactionType(): string;
  setTransactionType(value: string): GoalTransaction;

  getCreatedAt(): string;
  setCreatedAt(value: string): GoalTransaction;

  getNotes(): string;
  setNotes(value: string): GoalTransaction;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GoalTransaction.AsObject;
  static toObject(includeInstance: boolean, msg: GoalTransaction): GoalTransaction.AsObject;
  static serializeBinaryToWriter(message: GoalTransaction, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GoalTransaction;
  static deserializeBinaryFromReader(message: GoalTransaction, reader: jspb.BinaryReader): GoalTransaction;
}

export namespace GoalTransaction {
  export type AsObject = {
    id: number,
    goalId: string,
    balanceId: number,
    amount: number,
    transactionType: string,
    createdAt: string,
    notes: string,
  }
}

export class GetGoalTransactionsRequest extends jspb.Message {
  getGoalId(): string;
  setGoalId(value: string): GetGoalTransactionsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetGoalTransactionsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetGoalTransactionsRequest): GetGoalTransactionsRequest.AsObject;
  static serializeBinaryToWriter(message: GetGoalTransactionsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetGoalTransactionsRequest;
  static deserializeBinaryFromReader(message: GetGoalTransactionsRequest, reader: jspb.BinaryReader): GetGoalTransactionsRequest;
}

export namespace GetGoalTransactionsRequest {
  export type AsObject = {
    goalId: string,
  }
}

export class GetGoalTransactionsResponse extends jspb.Message {
  getTransactionsList(): Array<GoalTransaction>;
  setTransactionsList(value: Array<GoalTransaction>): GetGoalTransactionsResponse;
  clearTransactionsList(): GetGoalTransactionsResponse;
  addTransactions(value?: GoalTransaction, index?: number): GoalTransaction;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetGoalTransactionsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetGoalTransactionsResponse): GetGoalTransactionsResponse.AsObject;
  static serializeBinaryToWriter(message: GetGoalTransactionsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetGoalTransactionsResponse;
  static deserializeBinaryFromReader(message: GetGoalTransactionsResponse, reader: jspb.BinaryReader): GetGoalTransactionsResponse;
}

export namespace GetGoalTransactionsResponse {
  export type AsObject = {
    transactionsList: Array<GoalTransaction.AsObject>,
  }
}

