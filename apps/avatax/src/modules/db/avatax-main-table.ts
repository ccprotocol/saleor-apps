import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Entity, schema, string, Table } from "dynamodb-toolbox";

import { env } from "@/env";
import { createDynamoDBClient, createDynamoDBDocumentClient } from "@/lib/dynamodb-client";

type PartitionKey = { name: "PK"; type: "string" };
type SortKey = { name: "SK"; type: "string" };


export class AvataxMainTable extends Table<PartitionKey, SortKey> {
  private constructor(args: ConstructorParameters<typeof Table<PartitionKey, SortKey>>[number]) {
    super(args);
  }

  static create({
    documentClient,
    tableName,
  }: {
    documentClient: DynamoDBDocumentClient;
    tableName: string;
  }): AvataxMainTable {
    return new AvataxMainTable({
      documentClient,
      name: tableName,
      partitionKey: { name: "PK", type: "string" },
      sortKey: {
        name: "SK",
        type: "string",
      },
    });
  }

  static getAPLPrimaryKey({ saleorApiUrl }: { saleorApiUrl: string }) {
    return `${saleorApiUrl}` as const;
  }

  static getAPLSortKey() {
    return `APL` as const;
  }

  static getConfigPrimaryKey({ saleorApiUrl, appId }: { saleorApiUrl: string; appId: string }) {
    return `${saleorApiUrl}#${appId}` as const;
  }

  static getConfigSortKey({ connectionId }: { connectionId: string }) {
    return `AVATAX_CONFIG#${connectionId}` as const;
  }
}

const AvataxConfigTableSchema = {
  apl: schema({
    PK: string().key(),
    SK: string().key(),
    domain: string().optional(),
    token: string(),
    saleorApiUrl: string(),
    appId: string(),
    jwks: string().optional(),
  }),
  config: schema({
    PK: string().key(),
    SK: string().key(),
    connectionId: string(),  
    provider: string(),    
    configJson: string(), 
  }),
};

export const client = createDynamoDBClient();
export const documentClient = createDynamoDBDocumentClient(client);

export const avataxMainTable = AvataxMainTable.create({
  tableName: env.DYNAMODB_MAIN_TABLE_NAME,
  documentClient,
});

export const AvataxMainTableEntityFactory = {
  createAPLEntity: (table: AvataxMainTable) => {
    return new Entity({
      table,
      name: "APL",
      schema: AvataxConfigTableSchema.apl,
      timestamps: {
        created: {
          name: "createdAt",
          savedAs: "createdAt",
        },
        modified: {
          name: "modifiedAt",
          savedAs: "modifiedAt",
        },
      },
    });
  },
  createConfigEntity: (table: AvataxMainTable) => {
    return new Entity({
      table,
      name: "Config",
      schema: AvataxConfigTableSchema.config,
      timestamps: {
        created: {
          name: "createdAt",
          savedAs: "createdAt",
        },
        modified: {
          name: "modifiedAt",
          savedAs: "modifiedAt",
        },
      },
    });
  },
};

export type AvataxAPLEntityType = ReturnType<typeof AvataxMainTableEntityFactory.createAPLEntity>;
export type AvataxConfigEntityType = ReturnType<typeof AvataxMainTableEntityFactory.createConfigEntity>;
