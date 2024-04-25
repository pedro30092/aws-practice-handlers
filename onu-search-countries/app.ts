import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import dotenv from 'dotenv';

dotenv.config();

//Select the correct client credentials
let client: DynamoDBClient;
if (String(process.env.AWS_LOCAL) === 'true') {
    console.debug('Using local credentials...');
    const clientCredentials = {
        region: String(process.env.AWS_LOCAL_REGION),
        endpoint: String(process.env.AWS_LOCAL_ENDPOINT),
        credentials: {
            accessKeyId: String(process.env.AWS_LOCAL_SECRET_KEY_ID),
            secretAccessKey: String(process.env.AWS_LOCAL_SECRET_ACCESS_KEY),
        },
    };

    console.log(JSON.stringify(clientCredentials));

    client = new DynamoDBClient(clientCredentials);
} else {
    console.debug('Using cloud credentials...');
    client = new DynamoDBClient({});
}

const docClient = DynamoDBDocumentClient.from(client);

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const command = new ScanCommand({
            TableName: 'Country',
            FilterExpression: 'hasDevLaw = :hasDevLaw',
            ExpressionAttributeValues: {
                ':hasDevLaw': true,
            },
            ProjectionExpression: 'countryName',
        });

        const result: any = await docClient.send(command);

        if (result.Items.length > 0) {
            await dispatchMessage(result.Items);
        }

        const response = {
            statusCode: 200,
            body: 'Message dispatched',
        };

        return response;
    } catch (err: any) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: err.message ?? 'some error happened',
            }),
        };
    }
};

export const dispatchMessage = async (countries: any[]): Promise<void> => {
    const payload: string[] = [];
    const totalCountryToReview = 5;
    countries.forEach(async (country, index) => {
        if (index + 1 > totalCountryToReview) {
            return;
        }
        payload.push(country.countryName);
    });

    console.log('dispatching message: ' + JSON.stringify(payload));
};
