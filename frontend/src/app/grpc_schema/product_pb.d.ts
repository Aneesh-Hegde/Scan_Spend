import * as jspb from 'google-protobuf'



export class AddProductRequest extends jspb.Message {
  getCategoryId(): number;
  setCategoryId(value: number): AddProductRequest;

  getName(): string;
  setName(value: string): AddProductRequest;

  getDescription(): string;
  setDescription(value: string): AddProductRequest;

  getPrice(): number;
  setPrice(value: number): AddProductRequest;

  getDate(): string;
  setDate(value: string): AddProductRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AddProductRequest.AsObject;
  static toObject(includeInstance: boolean, msg: AddProductRequest): AddProductRequest.AsObject;
  static serializeBinaryToWriter(message: AddProductRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AddProductRequest;
  static deserializeBinaryFromReader(message: AddProductRequest, reader: jspb.BinaryReader): AddProductRequest;
}

export namespace AddProductRequest {
  export type AsObject = {
    categoryId: number,
    name: string,
    description: string,
    price: number,
    date: string,
  }
}

export class UpdateProductRequest extends jspb.Message {
  getProductId(): number;
  setProductId(value: number): UpdateProductRequest;

  getName(): string;
  setName(value: string): UpdateProductRequest;

  getDescription(): string;
  setDescription(value: string): UpdateProductRequest;

  getPrice(): number;
  setPrice(value: number): UpdateProductRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateProductRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateProductRequest): UpdateProductRequest.AsObject;
  static serializeBinaryToWriter(message: UpdateProductRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateProductRequest;
  static deserializeBinaryFromReader(message: UpdateProductRequest, reader: jspb.BinaryReader): UpdateProductRequest;
}

export namespace UpdateProductRequest {
  export type AsObject = {
    productId: number,
    name: string,
    description: string,
    price: number,
  }
}

export class DeleteProductRequest extends jspb.Message {
  getProductId(): number;
  setProductId(value: number): DeleteProductRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteProductRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteProductRequest): DeleteProductRequest.AsObject;
  static serializeBinaryToWriter(message: DeleteProductRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteProductRequest;
  static deserializeBinaryFromReader(message: DeleteProductRequest, reader: jspb.BinaryReader): DeleteProductRequest;
}

export namespace DeleteProductRequest {
  export type AsObject = {
    productId: number,
  }
}

export class GetProductsByUserRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetProductsByUserRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetProductsByUserRequest): GetProductsByUserRequest.AsObject;
  static serializeBinaryToWriter(message: GetProductsByUserRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetProductsByUserRequest;
  static deserializeBinaryFromReader(message: GetProductsByUserRequest, reader: jspb.BinaryReader): GetProductsByUserRequest;
}

export namespace GetProductsByUserRequest {
  export type AsObject = {
  }
}

export class ProductResponse extends jspb.Message {
  getMessage(): string;
  setMessage(value: string): ProductResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProductResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ProductResponse): ProductResponse.AsObject;
  static serializeBinaryToWriter(message: ProductResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProductResponse;
  static deserializeBinaryFromReader(message: ProductResponse, reader: jspb.BinaryReader): ProductResponse;
}

export namespace ProductResponse {
  export type AsObject = {
    message: string,
  }
}

export class Product extends jspb.Message {
  getProductName(): string;
  setProductName(value: string): Product;

  getQuantity(): number;
  setQuantity(value: number): Product;

  getAmount(): number;
  setAmount(value: number): Product;

  getDate(): string;
  setDate(value: string): Product;

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
    productName: string,
    quantity: number,
    amount: number,
    date: string,
    category: string,
  }
}

export class ProductsList extends jspb.Message {
  getProductsList(): Array<Product>;
  setProductsList(value: Array<Product>): ProductsList;
  clearProductsList(): ProductsList;
  addProducts(value?: Product, index?: number): Product;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProductsList.AsObject;
  static toObject(includeInstance: boolean, msg: ProductsList): ProductsList.AsObject;
  static serializeBinaryToWriter(message: ProductsList, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProductsList;
  static deserializeBinaryFromReader(message: ProductsList, reader: jspb.BinaryReader): ProductsList;
}

export namespace ProductsList {
  export type AsObject = {
    productsList: Array<Product.AsObject>,
  }
}

