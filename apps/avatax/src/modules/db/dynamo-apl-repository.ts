import { AuthData } from "@saleor/app-sdk/APL";
import { DeleteItemCommand, GetItemCommand, PutItemCommand, ScanCommand } from "dynamodb-toolbox";
import { err, ok, ResultAsync } from "neverthrow";

import { BaseError } from "@/error";
import { createLogger } from "@/logger";
import {
  AvataxMainTable,
  avataxMainTable,
  AvataxMainTableEntityFactory,
} from "@/modules/db/avatax-main-table";

import { DynamoAPLMapper } from "./dynamo-apl-mapper";
import { APLRepository } from "./types";

export class DynamoAPLRepository implements APLRepository {
  private logger = createLogger("AvataxAPLRepository");

  private aplEntity = AvataxMainTableEntityFactory.createAPLEntity(avataxMainTable);

  private aplMapper = new DynamoAPLMapper();

  static ReadEntityError = BaseError.subclass("ReadEntityError");
  static WriteEntityError = BaseError.subclass("WriteEntityError");
  static DeleteEntityError = BaseError.subclass("DeleteEntityError");
  static ScanEntityError = BaseError.subclass("ScanEntityError");

  constructor() {}

  async getEntry(args: { saleorApiUrl: string }) {
    const getEntryResult = await ResultAsync.fromPromise(
      this.aplEntity
        .build(GetItemCommand)
        .key({
          PK: AvataxMainTable.getAPLPrimaryKey({
            saleorApiUrl: args.saleorApiUrl,
          }),
          SK: AvataxMainTable.getAPLSortKey(),
        })
        .send(),
      (error) =>
        new DynamoAPLRepository.ReadEntityError("Failed to read APL entity", { cause: error }),
    );

    if (getEntryResult.isErr()) {
      this.logger.error("Error while reading APL entity from DynamoDB", {
        error: getEntryResult.error,
      });

      return err(getEntryResult.error);
    }

    if (!getEntryResult.value.Item) {
      this.logger.warn("APL entry not found", { args });

      return ok(null);
    }

    return ok(this.aplMapper.dynamoEntityToAuthData(getEntryResult.value.Item));
  }

  async setEntry(args: { authData: AuthData }) {
    const setEntryResult = await ResultAsync.fromPromise(
      this.aplEntity
        .build(PutItemCommand)
        .item(this.aplMapper.authDataToDynamoPutEntity(args.authData))
        .send(),
      (error) =>
        new DynamoAPLRepository.WriteEntityError("Failed to write APL entity", {
          cause: error,
        }),
    );

    if (setEntryResult.isErr()) {
      this.logger.error("Error while putting APL into DynamoDB", {
        error: setEntryResult.error,
      });

      return err(setEntryResult.error);
    }

    return ok(undefined);
  }

  async deleteEntry(args: { saleorApiUrl: string }) {
    const deleteEntryResult = await ResultAsync.fromPromise(
      this.aplEntity
        .build(DeleteItemCommand)
        .key({
          PK: AvataxMainTable.getAPLPrimaryKey({
            saleorApiUrl: args.saleorApiUrl,
          }),
          SK: AvataxMainTable.getAPLSortKey(),
        })
        .send(),
      (error) =>
        new DynamoAPLRepository.DeleteEntityError("Failed to delete APL entity", {
          cause: error,
        }),
    );

    if (deleteEntryResult.isErr()) {
      this.logger.error("Error while deleting APL entry from DynamoDB", {
        error: deleteEntryResult.error,
      });

      return err(deleteEntryResult.error);
    }

    return ok(undefined);
  }

  async getAllEntries() {
    const scanEntriesResult = await ResultAsync.fromPromise(
      this.aplEntity.table
        .build(ScanCommand)
        .entities(this.aplEntity)
        .options({
          maxPages: Infinity,
        })
        .send(),
      (error) =>
        new DynamoAPLRepository.ScanEntityError("Failed to scan APL entities", {
          cause: error,
        }),
    );

    if (scanEntriesResult.isErr()) {
      this.logger.error("Error while scanning APL entities from DynamoDB", {
        error: scanEntriesResult.error,
      });

      return err(scanEntriesResult.error);
    }

    const possibleItems = scanEntriesResult.value.Items ?? [];

    return ok(possibleItems.map(this.aplMapper.dynamoEntityToAuthData));
  }
}
