import * as jspb from 'google-protobuf'



export class GetTextRequest extends jspb.Message {
  getFilename(): string;
  setFilename(value: string): GetTextRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetTextRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetTextRequest): GetTextRequest.AsObject;
  static serializeBinaryToWriter(message: GetTextRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetTextRequest;
  static deserializeBinaryFromReader(message: GetTextRequest, reader: jspb.BinaryReader): GetTextRequest;
}

export namespace GetTextRequest {
  export type AsObject = {
    filename: string,
  }
}

export class GetTextResponse extends jspb.Message {
  getProductsList(): Array<Product>;
  setProductsList(value: Array<Product>): GetTextResponse;
  clearProductsList(): GetTextResponse;
  addProducts(value?: Product, index?: number): Product;

  getTotal(): string;
  setTotal(value: string): GetTextResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetTextResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetTextResponse): GetTextResponse.AsObject;
  static serializeBinaryToWriter(message: GetTextResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetTextResponse;
  static deserializeBinaryFromReader(message: GetTextResponse, reader: jspb.BinaryReader): GetTextResponse;
}

export namespace GetTextResponse {
  export type AsObject = {
    productsList: Array<Product.AsObject>,
    total: string,
  }
}

export class Product extends jspb.Message {
  getId(): string;
  setId(value: string): Product;

  getProductName(): string;
  setProductName(value: string): Product;

  getQuantity(): number;
  setQuantity(value: number): Product;

  getAmount(): number;
  setAmount(value: number): Product;

  getName(): string;
  setName(value: string): Product;

  getCategory(): string;
  setCategory(value: string): Product;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Product.AsObject;
  static toObject(includeInstance: boolean, msg: Product): Product.AsObject;
  static serializeBinaryToWriter(message: Product, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Product;
  static deserializeBinaryFromReader(message: Product, reader: jspb.BinaryReader): Product;
}

export namespace Product {
  export type AsObject = {
    id: string,
    productName: string,
    quantity: number,
    amount: number,
    name: string,
    category: string,
  }
}

export class GetProducts extends jspb.Message {
  getProductsList(): Array<Product>;
  setProductsList(value: Array<Product>): GetProducts;
  clearProductsList(): GetProducts;
  addProducts(value?: Product, index?: number): Product;

  getFilename(): string;
  setFilename(value: string): GetProducts;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetProducts.AsObject;
  static toObject(includeInstance: boolean, msg: GetProducts): GetProducts.AsObject;
  static serializeBinaryToWriter(message: GetProducts, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetProducts;
  static deserializeBinaryFromReader(message: GetProducts, reader: jspb.BinaryReader): GetProducts;
}

export namespace GetProducts {
  export type AsObject = {
    productsList: Array<Product.AsObject>,
    filename: string,
  }
}

export class DBMessage extends jspb.Message {
  getMessage(): string;
  setMessage(value: string): DBMessage;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DBMessage.AsObject;
  static toObject(includeInstance: boolean, msg: DBMessage): DBMessage.AsObject;
  static serializeBinaryToWriter(message: DBMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DBMessage;
  static deserializeBinaryFromReader(message: DBMessage, reader: jspb.BinaryReader): DBMessage;
}

export namespace DBMessage {
  export type AsObject = {
    message: string,
  }
}

