import * as jspb from 'google-protobuf'



export class GetFileByUser extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetFileByUser.AsObject;
  static toObject(includeInstance: boolean, msg: GetFileByUser): GetFileByUser.AsObject;
  static serializeBinaryToWriter(message: GetFileByUser, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetFileByUser;
  static deserializeBinaryFromReader(message: GetFileByUser, reader: jspb.BinaryReader): GetFileByUser;
}

export namespace GetFileByUser {
  export type AsObject = {
  }
}

export class File extends jspb.Message {
  getFilename(): string;
  setFilename(value: string): File;

  getImageUrl(): string;
  setImageUrl(value: string): File;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): File.AsObject;
  static toObject(includeInstance: boolean, msg: File): File.AsObject;
  static serializeBinaryToWriter(message: File, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): File;
  static deserializeBinaryFromReader(message: File, reader: jspb.BinaryReader): File;
}

export namespace File {
  export type AsObject = {
    filename: string,
    imageUrl: string,
  }
}

export class FileList extends jspb.Message {
  getAllfilesList(): Array<File>;
  setAllfilesList(value: Array<File>): FileList;
  clearAllfilesList(): FileList;
  addAllfiles(value?: File, index?: number): File;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FileList.AsObject;
  static toObject(includeInstance: boolean, msg: FileList): FileList.AsObject;
  static serializeBinaryToWriter(message: FileList, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FileList;
  static deserializeBinaryFromReader(message: FileList, reader: jspb.BinaryReader): FileList;
}

export namespace FileList {
  export type AsObject = {
    allfilesList: Array<File.AsObject>,
  }
}

export class UploadFileRequest extends jspb.Message {
  getUserId(): number;
  setUserId(value: number): UploadFileRequest;

  getFilename(): string;
  setFilename(value: string): UploadFileRequest;

  getChunkData(): Uint8Array | string;
  getChunkData_asU8(): Uint8Array;
  getChunkData_asB64(): string;
  setChunkData(value: Uint8Array | string): UploadFileRequest;

  getChunkNumber(): number;
  setChunkNumber(value: number): UploadFileRequest;

  getTotalChunks(): number;
  setTotalChunks(value: number): UploadFileRequest;

  getRefreshToken(): string;
  setRefreshToken(value: string): UploadFileRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UploadFileRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UploadFileRequest): UploadFileRequest.AsObject;
  static serializeBinaryToWriter(message: UploadFileRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UploadFileRequest;
  static deserializeBinaryFromReader(message: UploadFileRequest, reader: jspb.BinaryReader): UploadFileRequest;
}

export namespace UploadFileRequest {
  export type AsObject = {
    userId: number,
    filename: string,
    chunkData: Uint8Array | string,
    chunkNumber: number,
    totalChunks: number,
    refreshToken: string,
  }
}

export class UploadFileResponse extends jspb.Message {
  getSuccess(): boolean;
  setSuccess(value: boolean): UploadFileResponse;

  getMessage(): string;
  setMessage(value: string): UploadFileResponse;

  getImageUrl(): string;
  setImageUrl(value: string): UploadFileResponse;

  getUserId(): number;
  setUserId(value: number): UploadFileResponse;

  getChunkStatus(): string;
  setChunkStatus(value: string): UploadFileResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UploadFileResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UploadFileResponse): UploadFileResponse.AsObject;
  static serializeBinaryToWriter(message: UploadFileResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UploadFileResponse;
  static deserializeBinaryFromReader(message: UploadFileResponse, reader: jspb.BinaryReader): UploadFileResponse;
}

export namespace UploadFileResponse {
  export type AsObject = {
    success: boolean,
    message: string,
    imageUrl: string,
    userId: number,
    chunkStatus: string,
  }
}

