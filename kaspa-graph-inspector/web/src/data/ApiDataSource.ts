import DataSource from "./DataSource";
import {BlockHashById} from "../model/BlockHashById";
import {apiAddress} from "../addresses";
import {BlocksAndEdgesAndHeightGroups} from "../model/BlocksAndEdgesAndHeightGroups";
import {AppConfig} from "../model/AppConfig";
import {packageVersion} from "../version";

export default class ApiDataSource implements DataSource {
    getTickIntervalInMilliseconds = (): number => {
        return 200;
    };

    getBlocksBetweenHeights = (startHeight: number, endHeight: number): Promise<BlocksAndEdgesAndHeightGroups | void> => {
        return this.fetch(`${apiAddress}/blocksBetweenHeights?startHeight=${startHeight}&endHeight=${endHeight}`);
    };

    getBlockHash = (targetHash: string, heightDifference: number): Promise<BlocksAndEdgesAndHeightGroups | void> => {
        return this.fetch(`${apiAddress}/blockHash?blockHash=${targetHash}&heightDifference=${heightDifference}`);
    };

    getBlockDAAScore = (targetDAAScore: number, heightDifference: number): Promise<BlocksAndEdgesAndHeightGroups | void> => {
        return this.fetch(`${apiAddress}/blockDAAScore?blockDAAScore=${targetDAAScore}&heightDifference=${heightDifference}`);
    };

    getHead = (heightDifference: number): Promise<BlocksAndEdgesAndHeightGroups | void> => {
        return this.fetch(`${apiAddress}/head?heightDifference=${heightDifference}`);
    };

    getBlockHashesByIds = (blockIds: string): Promise<BlockHashById[] | void> => {
        return this.fetch(`${apiAddress}/blockHashesByIds?blockIds=${blockIds}`);
    };

    getAppConfig = (): Promise<AppConfig | void> => {
        return this.fetch<AppConfig>(`${apiAddress}/appConfig`)
            .then(config => {
                if (config) {
                    (config as AppConfig).webVersion = packageVersion;
                }
                return config;
            });
    };

    private fetch = async <T>(url: string): Promise<T | void> => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
            }

            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) {
                const rawText = await response.text();
                try {
                    return JSON.parse(rawText) as T;
                } catch (parseError) {
                    throw new Error(`Expected JSON, got: ${rawText || "non-JSON response"}`);
                }
            }

            return response.json();
        } catch (error) {
            console.error(`Fetch failed for ${url}:`, error);
            return Promise.resolve();
        }
    };
}
