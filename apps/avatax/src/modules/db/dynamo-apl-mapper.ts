import { AuthData } from "@saleor/app-sdk/APL";
import { FormattedItem, type PutItemInput } from "dynamodb-toolbox";

import { AvataxAPLEntityType, AvataxMainTable } from "@/modules/db/avatax-main-table";

export class DynamoAPLMapper {
  dynamoEntityToAuthData(entity: FormattedItem<AvataxAPLEntityType>): AuthData {
    return {
      domain: entity.domain,
      token: entity.token,
      saleorApiUrl: entity.saleorApiUrl,
      appId: entity.appId,
      jwks: entity.jwks,
    };
  }

  authDataToDynamoPutEntity(authData: AuthData): PutItemInput<AvataxAPLEntityType> {
    return {
      PK: AvataxMainTable.getAPLPrimaryKey({ saleorApiUrl: authData.saleorApiUrl }),
      SK: AvataxMainTable.getAPLSortKey(),
      domain: authData.domain,
      token: authData.token,
      saleorApiUrl: authData.saleorApiUrl,
      appId: authData.appId,
      jwks: authData.jwks,
    };
  }
}
