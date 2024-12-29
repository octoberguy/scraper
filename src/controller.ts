import type Hero from "@ulixee/hero";
import type {Core} from "./core";
import type {ILogger} from "./logger";

export type Controller = new () => AbstractController;
export abstract class AbstractController {
    protected browser: Hero;
    protected core: Core;
    protected logger: ILogger;
    abstract readonly name: string;

    protected constructor(browser: Hero, core: Core) {
        this.browser = browser;
        this.core = core;
        this.logger = core.logger;
    }

    abstract async handle(input: { [p: string]: any }): Promise<void>
}
