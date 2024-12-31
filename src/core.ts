import amqp from "amqplib";
import Hero from "@ulixee/hero";
import type {Channel, Connection, ConsumeMessage, Options} from "amqplib";
import type {Controller} from "./controller";
import type {ILogger} from "./logger";

interface Queue {
    name: string,
    prefetch: number,
    consumeOptions: Options.Consume,
    assertOptions: Options.AssertQueue,
}
interface Settings {
    maxRetry?: number;
    logger: ILogger,
    envelopeValidationFunc: Function;
    browserHost: string,
    amqpOptions: Options.Connect,
    queues: Queue[],
    controllers: Controller[],
}
interface Envelope {
    uuid: string,
    previous_attempts_uuids: string[],
    controller: string,
    message_uuid: string,
    message: { [p: string]: any },
}
export class Core {
    settings: Settings;
    private logger: ILogger;
    private connection: Connection;
    private channels: Map<string, Channel> = new Map();
    private consumers: {tag: string, channel: Channel}[] = [];
    private controllers: Map<string, Controller> = new Map();
    private tasksCount = 0;
    private onZeroTasks: Function = null;

    async start(settings: Settings): Promise<void> {
        this.settings = settings;
        this.logger = settings.logger;
        for (let controller of settings.controllers)
            this.controllers.set(controller.name, controller);

        this.connection = await amqp.connect(settings.amqpOptions);

        process.on('SIGINT', this.stop.bind(this));
        process.on('SIGTERM', this.stop.bind(this));

        await Promise.all(settings.queues.map(async queue => {
            const channel = await this.connection.createChannel();
            await channel.prefetch(queue.prefetch);
            await channel.assertQueue(queue.name, queue.assertOptions);
            const handler = async (msg: ConsumeMessage|null): Promise<void> => {
                if (msg === null)
                    return;
                try {
                    await this.handle(msg);
                    channel.ack(msg);
                } catch (e) {
                    this.logger.error('Envelope processing failed', {e, envelope: msg.content.toString()});
                    channel.reject(msg, false);
                }
            };
            const consumerInfo = await channel.consume(queue.name, handler, queue.consumeOptions);
            this.consumers.push({tag: consumerInfo.consumerTag, channel});
            this.channels.set(queue.name, channel);
        }));
    }

    async stop(): Promise<void> {
        await Promise.all(this.consumers.map(consumer => consumer.channel.cancel(consumer.tag)));
        if (this.tasksCount > 0)
            await new Promise(resolve => this.onZeroTasks = resolve);
        await this.connection.close();
    }

    private async handle(msg: ConsumeMessage): Promise<void> {
        const envelope: Envelope = JSON.parse(msg.content.toString());
        if (!envelope.uuid?.length || !envelope.message_uuid?.length || !envelope.controller?.length || !envelope.message)
            throw new Error('Missing required fields in envelope');

        const controller = this.controllers.get(envelope.controller);
        if (controller === undefined)
            throw new Error('No such controller');

        const sessionLogger = this.logger.createChild({
            session: envelope.uuid,
            controller: envelope.controller,
            task: envelope.message_uuid,
        });
        if (envelope.previous_attempts_uuids?.length > this.settings.maxRetry) {
            sessionLogger.warn('Retry limit reached');
            return;
        }
        // this.settings.envelopeValidationFunc.bind(this)(envelope, sessionLogger); possible validation add-on
        sessionLogger.info('Message received and validated', {envelope});

        let browser = new Hero({

        });
        try {
            await (new controller(this, sessionLogger, browser)).handle(envelope.message);
        } catch (e) {

        }
    }
}
