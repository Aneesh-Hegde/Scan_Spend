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

