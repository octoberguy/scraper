export interface ILogger {
    constructor(parent?: ILogger)
    debug(message: string, meta: { [p: string]: any }): void
    info(message: string, meta: { [p: string]: any }): void
    warn(message: string, meta: { [p: string]: any }): void
    error(message: string, meta: { e: Error, [p: string]: any }): void
}