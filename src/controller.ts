import type Hero from "@ulixee/hero";
import type {Core} from "./core";
import type {ILogger} from "./logger";

export type Controller = new (core: Core, logger: ILogger, browser: Hero) => AbstractController;
export abstract class AbstractController {
    protected browser: Hero;
    protected core: Core;
    protected logger: ILogger;

    protected constructor(core: Core, logger: ILogger, browser: Hero) {
        this.browser = browser;
        this.core = core;
        this.logger = logger;
    }

    abstract async handle(input: { [p: string]: any }): Promise<void>
}
