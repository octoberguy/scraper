import amqp, {Channel, Connection, ConsumeMessage, Options, Replies} from "amqplib";
import HeroCore from "@ulixee/hero-core";
import TransportBridge from "@ulixee/net/lib/TransportBridge";
import Hero, {ConnectionToHeroCore, IHeroCreateOptions} from "@ulixee/hero";
import type {Controller} from "./controller";

class Core {
    private queuesConnection: Connection;
    private queuesChannel: Channel;
    private browserConnection: ConnectionToHeroCore;
    private browserCore: HeroCore;
    private controllers: Map<string, Controller> = new Map();
    private consumerTags: string[];
    private tasksCount = 0;
    private onZeroTasks: Function = null;

    async start(amqpOptions: Options, controllers: Controller[]) {
        const bridge = new TransportBridge();
        this.browserConnection = new ConnectionToHeroCore(bridge.transportToCore);
        this.browserCore = new HeroCore();
        this.browserCore.addConnection(bridge.transportToClient);
        await this.browserCore.start();

        this.queuesConnection = await amqp.connect(amqpOptions);
        this.queuesChannel = await this.queuesConnection.createChannel();
        await this.queuesChannel.prefetch(10);

        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());

        const consumeReplies: Promise<Replies.Consume>[] = [];
        const assertReplies: Promise<Replies.AssertExchange>[] = [];
        const assertedExchangesNames = [];
        const handler = msg => this.handle(msg);
        const options = {noAck: false};
        for (let ctrl of controllers) {
            this.controllers.set(ctrl.name, ctrl);

            if (!assertedExchangesNames.includes(ctrl.exchangeName)) {
                assertReplies.push(this.queuesChannel.assertExchange(ctrl.exchangeName, ctrl.exchangeType));
                assertedExchangesNames.push(ctrl.exchangeName);
            }
            consumeReplies.push(this.queuesChannel.consume(ctrl.queue, handler, options));
        }

        await Promise.all(assertReplies);
        this.consumerTags = await Promise.all(consumeReplies)
            .then(replies => replies.map(reply => reply.consumerTag));
    }

    async stop() {
        await Promise.all(this.consumerTags.map(tag => this.queuesChannel.cancel(tag)));
        if (this.tasksCount > 0)
            await new Promise(resolve => this.onZeroTasks = resolve);
        await Promise.all([this.queuesConnection.close(), this.browserCore.close()]);
    }

    private async handle(msg: ConsumeMessage|null) {

    }
}

const scraperCore = new Core();
export default scraperCore;