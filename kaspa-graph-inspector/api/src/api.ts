import express from 'express';
import Database from "./database.js";
import cors from 'cors';
import https from 'https';
import fs from 'fs';

const port = process.env.API_PORT;
if (!port) {
    console.log("The API_PORT environment variable is required");
    process.exit(1);
}

const protocol = process.env.API_PROTOCOL ? process.env.API_PROTOCOL : "http";
const cert = process.env.API_CERT;
const key = process.env.API_KEY;
if (protocol === "https") {
    if (!cert) {
        console.log("The API_CERT environment variable is requiered");
        process.exit(1);
    }
    if (!key) {
        console.log("The API_KEY environment variable is requiered");
        process.exit(1);
    }
}

const database = new Database();

const server = express();
server.use(cors());

const parseIntParam = (value: unknown, name: string): number => {
    if (typeof value !== "string") {
        throw new Error(`missing parameter: ${name}`);
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
        throw new Error(`invalid parameter: ${name}`);
    }
    return parsed;
};

server.get('/blocksBetweenHeights', async (request, response) => {
    if (!request.query.startHeight) {
        response.status(400).send("missing parameter: startHeight");
        return;
    }
    if (!request.query.endHeight) {
        response.status(400).send("missing parameter: endHeight");
        return;
    }

    try {
        await database.withClient(async client => {
            const startHeight = parseIntParam(request.query.startHeight, "startHeight");
            const endHeight = parseIntParam(request.query.endHeight, "endHeight");
            const blocksAndEdges = await database.getBlocksAndEdgesAndHeightGroups(client, startHeight, endHeight);
            response.send(JSON.stringify(blocksAndEdges));
        });
        return;
    } catch (error) {
        response.status(400).send(`invalid input: ${error}`);
        return;
    }
});

server.get('/head', async (request, response) => {
    if (!request.query.heightDifference) {
        response.status(400).send("missing parameter: heightDifference");
        return;
    }

    try {
        await database.withClient(async client => {
            const heightDifference = parseIntParam(request.query.heightDifference, "heightDifference");
            const endHeight = await database.getMaxHeight(client);
            let startHeight = endHeight - heightDifference;
            if (startHeight < 0) {
                startHeight = 0;
            }
            const blocksAndEdges = await database.getBlocksAndEdgesAndHeightGroups(client, startHeight, endHeight);
            response.send(JSON.stringify(blocksAndEdges));
        });
        return;
    } catch (error) {
        response.status(400).send(`invalid input: ${error}`);
        return;
    }
});

server.get('/blockHash', async (request, response) => {
    if (!request.query.blockHash) {
        response.status(400).send("missing parameter: blockHash");
        return;
    }
    if (!request.query.heightDifference) {
        response.status(400).send("missing parameter: heightDifference");
        return;
    }

    try {
        await database.withClient(async client => {
            const blockHash = (request.query.blockHash as string).toLowerCase();
            const height = await database.getBlockHeight(client, blockHash);
            const heightDifference = parseIntParam(request.query.heightDifference, "heightDifference");
            let startHeight = height - heightDifference;
            if (startHeight < 0) {
                startHeight = 0;
            }
            const endHeight = height + heightDifference;
            const blocksAndEdges = await database.getBlocksAndEdgesAndHeightGroups(client, startHeight, endHeight);
            response.send(JSON.stringify(blocksAndEdges));
        });
        return;
    } catch (error) {
        response.status(400).send(`invalid input: ${error}`);
        return;
    }
});

server.get('/blockDAAScore', async (request, response) => {
    if (!request.query.blockDAAScore) {
        response.status(400).send("missing parameter: blockDAAScore");
        return;
    }
    if (!request.query.heightDifference) {
        response.status(400).send("missing parameter: heightDifference");
        return;
    }

    try {
        await database.withClient(async client => {
            const blockDAAScore = parseIntParam(request.query.blockDAAScore, "blockDAAScore");
            const heightDifference = parseIntParam(request.query.heightDifference, "heightDifference");
            const height = await database.getBlockDAAScoreHeight(client, blockDAAScore);
            let startHeight = height - heightDifference;
            if (startHeight < 0) {
                startHeight = 0;
            }
            const endHeight = height + heightDifference;
            const blocksAndEdges = await database.getBlocksAndEdgesAndHeightGroups(client, startHeight, endHeight);
            response.send(JSON.stringify(blocksAndEdges));
        });
        return;
    } catch (error) {
        response.status(400).send(`invalid input: ${error}`);
        return;
    }
});

server.get('/blockHashesByIds', async (request, response) =>{
    if (!request.query.blockIds) {
        response.status(400).send("missing parameter: blockIds");
        return;
    }

    try {
        await database.withClient(async client => {
            const blockIdsString = request.query.blockIds as string;
            const blockIdStrings = blockIdsString.split(",");
            const blockIds = blockIdStrings.map(id => parseIntParam(id, "blockIds"));
            const hashesByIds = await database.getBlockHashesByIds(client, blockIds);

            response.send(JSON.stringify(hashesByIds));
        });
        return;
    } catch (error) {
        response.status(400).send(`invalid input: ${error}`);
        return;
    }
});

server.get('/appConfig', async (request, response) => {
    try {
        await database.withClient(async client => {
            const appConfig = await database.getAppConfig(client);
            response.send(JSON.stringify(appConfig));
        });
        return;
    } catch (error) {
        response.status(400).send(`invalid input: ${error}`);
        return;
    }
});

if (protocol === "https") {
    https
        .createServer(
        {
            key: fs.readFileSync(key!),
            cert: fs.readFileSync(cert!),
        },
        server
        )
        .listen(port, () => {
        console.log(`API server listening on port ${port} using protocol ${protocol}...`);
        });
} else {
    server.listen(port, () => {
        console.log(`API server listening on port ${port} using protocol ${protocol}...`);
    });
}
