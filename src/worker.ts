import { Client as notion_Client } from "@notionhq/client";
import { Client as redis_Client } from "redis-om";
import * as dotenv from "dotenv";
dotenv.config();

const main = async () => {
  let counter = 0;
  setInterval(async () => {
    if (counter % 60 == 0) {
      await fullsyncDB();
    } else {
      await syncDB();
    }
    counter++;
  }, 60000);
};

const fullsyncDB = async () => {
  const redis_client = new redis_Client();
  if (!redis_client.isOpen()) {
    await redis_client.open(process.env.REDIS_URL);
  }
  let result = await redis_client.execute(["HGETALL", "notion-pages"]);
  //@ts-ignore
  for (let i = 0; i < result.length / 2; i++) {
    //@ts-ignore
    let serializedJSON = await getSerializedJSON(result[i * 2 + 1]);
    //@ts-ignore
    await updateJSON(redis_client, result[i * 2], serializedJSON);
  }
  await redis_client.close();
};

const syncDB = async () => {
  const redis_client = new redis_Client();
  if (!redis_client.isOpen()) {
    await redis_client.open(process.env.REDIS_URL);
  }
  let result = await redis_client.execute(["HGETALL", "notion-pages"]);
  //@ts-ignore
  for (let i = 0; i < result.length / 2; i++) {
    //@ts-ignore
    let jsonResult = await redis_client.execute(["JSON.GET", result[i * 2]]);
    if (jsonResult == null) {
      //@ts-ignore
      let serializedJSON = await getSerializedJSON(result[i * 2 + 1]);
      console.log(serializedJSON);
      //@ts-ignore
      await writeJSON(redis_client, result[i * 2], serializedJSON);
    }
  }
  await redis_client.close();
};

const writeJSON = async (redis_client: redis_Client, key: string, json: any) => {
  await redis_client.execute(["JSON.SET", key, ".", json]);
};

const updateJSON = async (redis_client: redis_Client, key: string, json: any) => {
  await redis_client.execute(["JSON.SET", key, "$", json]);
};

const getSerializedJSON = async (databaseId: string) => {
  const notion_client = new notion_Client({ auth: process.env.NOTION_KEY });
  const response = await notion_client.blocks.children.list({ block_id: databaseId });
  return JSON.stringify(response);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
