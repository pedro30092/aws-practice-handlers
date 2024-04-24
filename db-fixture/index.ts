import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import dotenv from "dotenv";

dotenv.config();

export const countries = faker.helpers.multiple(
  () => {
    return {
      name: faker.location.country(),
    };
  },
  {
    count: 100,
  }
);

export const generateNews = (total: number) => {
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
};

const client = new DynamoDBClient({
  region: String(process.env.AWS_REGION),
  endpoint: String(process.env.AWS_ENDPOINT),
  credentials: {
    accessKeyId: String(process.env.AWS_ACCESS_KEY_ID),
    secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY),
  },
});
const docClient = DynamoDBDocumentClient.from(client);

export const main = async () => {
  const nonDuplicatedCountries: string[] = [];

  //Filter countries to avoid duplicates
  const countriesToAdd = countries.filter((country) => {
    if (nonDuplicatedCountries.includes(country.name)) {
      return false;
    } else {
      nonDuplicatedCountries.push(country.name);
      return true;
    }
  });

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
      name: country.name,
      hasDevLaw: hasDevLaw,
      news: news,
    };
  });

  //Insert data into DynamoDB
  for (const item of putItems) {
    console.log("Adding item: ", JSON.stringify(item));

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
