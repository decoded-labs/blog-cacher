"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@notionhq/client");
const redis_om_1 = require("redis-om");
const dotenv = require("dotenv");
dotenv.config();
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        yield syncDB();
        console.log("Sleeping for 30 seconds..");
    }), 30000);
});
const syncDB = () => __awaiter(void 0, void 0, void 0, function* () {
    const redis_client = new redis_om_1.Client();
    if (!redis_client.isOpen()) {
        yield redis_client.open(process.env.REDIS_URL);
    }
    let result = yield redis_client.execute(["HGETALL", "notion-pages"]);
    //@ts-ignore
    for (let i = 0; i < result.length / 2; i++) {
        //@ts-ignore
        let jsonResult = yield redis_client.execute(["JSON.GET", result[i * 2]]);
        if (jsonResult == null) {
            //@ts-ignore
            let serializedJSON = yield getSerializedJSON(result[i * 2 + 1]);
            console.log(serializedJSON);
            //@ts-ignore
            yield writeJSON(redis_client, result[i * 2], serializedJSON);
        }
    }
    yield redis_client.close();
});
const writeJSON = (redis_client, key, json) => __awaiter(void 0, void 0, void 0, function* () {
    yield redis_client.execute(["JSON.SET", key, ".", json]);
});
const getSerializedJSON = (databaseId) => __awaiter(void 0, void 0, void 0, function* () {
    const notion_client = new client_1.Client({ auth: process.env.NOTION_KEY });
    const response = yield notion_client.blocks.children.list({ block_id: databaseId });
    return JSON.stringify(response);
});
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
