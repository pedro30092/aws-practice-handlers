import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import dotenv from "dotenv";

dotenv.config();

function generateRandomeCountries(total: number) {
  return faker.helpers.multiple(
    () => {
      return {
        name: faker.location.country(),
      };
    },
    {
      count: total,
    }
  );
}

function generateNews(total: number): any {
  const data = faker.helpers.multiple(
    () => {
      return {
        title: faker.lorem.slug(),
        description: faker.lorem.text(),
      };
    },
    {
      count: total,
    }
  );

  return data;
}

async function resetTable() {
  const listCommand = new ListTablesCommand({});
  const listResponse = await docClient.send(listCommand);
  const tableName = "Country";
  const tables = listResponse.TableNames;

  if (tables && tables.includes(tableName)) {
    console.log("Deleting table Country...");
    const deleteCommand = new DeleteTableCommand({
      TableName: tableName,
    });
    await docClient.send(deleteCommand);
  }

  console.log("Creating table Country...");
  const createCommand = new CreateTableCommand({
    TableName: tableName,
    AttributeDefinitions: [
      {
        AttributeName: "id",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "id",
        KeyType: "HASH",
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
  });

  await docClient.send(createCommand);
}

//Select the correct client credentials
let client: DynamoDBClient;
if (process.env.AWS_LOCAL === "true") {
  console.debug("Using local credentials...");
  const clientCredentials = {
    region: String(process.env.AWS_REGION),
    endpoint: String(process.env.AWS_ENDPOINT),
    credentials: {
      accessKeyId: String(process.env.AWS_SECRET_KEY_ID),
      secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY),
    },
  };
  client = new DynamoDBClient(clientCredentials);
} else {
  console.debug("Using cloud credentials...");
  client = new DynamoDBClient({});
}

const docClient = DynamoDBDocumentClient.from(client);
const totalCountries = 100;

export const main = async () => {
  await resetTable();

  const nonDuplicatedCountries: string[] = [];

  //Filter countries to avoid duplicates
  const countriesToAdd = generateRandomeCountries(totalCountries).filter(
    (country) => {
      if (nonDuplicatedCountries.includes(country.name)) {
        return false;
      } else {
        nonDuplicatedCountries.push(country.name);
        return true;
      }
    }
  );

  //Generate PutItem request structure
  const putItems = countriesToAdd.map((country) => {
    const totalNews = Math.floor(Math.random() * (10 - 1 + 1) + 1);
    const news = generateNews(totalNews);
    const validateIfHasDevLaw = Math.floor(Math.random() * (5 - 1 + 1) + 1);
    let hasDevLaw = false;

    if (validateIfHasDevLaw === 1) {
      hasDevLaw = true;
      news.push({
        title: "Developer Law",
        description: "The country has a developer law",
      });
    }

    return {
      id: faker.string.uuid(),
      countryName: country.name,
      hasDevLaw: hasDevLaw,
      news: news,
    };
  });

  //Insert data into DynamoDB
  for (const item of putItems) {
    const command = new PutCommand({
      TableName: "Country",
      Item: item,
    });

    await docClient.send(command);
  }
};

console.log("Init DB Fixture...");

main()
  .then(() => {
    console.log("Finishing DB Fixture...");
  })
  .catch((error) => {
    console.error("Error DB Fixture...");
    console.error(error.message);
  });
