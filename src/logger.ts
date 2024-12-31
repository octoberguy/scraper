export interface ILogger {
    debug(action: string, context?: { [p: string]: any }): void
    info(action: string, context?: { [p: string]: any }): void
    warn(action: string, context?: { [p: string]: any }): void
    error(action: string, context: { e: Error, [p: string]: any }): void
    createChild(boundContext: {[p: string]: any}): ILogger
    addToContext(boundContext: {[p: string]: any}): void
}