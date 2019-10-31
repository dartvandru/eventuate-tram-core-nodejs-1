const chai = require('chai');
const { expect } = chai;
const chaiAsPromised = require('chai-as-promised');
const helpers = require('./lib/helpers');
const MessageConsumer = require('../lib/kafka/MessageConsumer');
const IdGenerator = require('../lib/IdGenerator');
const KafkaProducer = require('../lib/kafka/KafkaProducer');
const MessageProducer = require('../lib/MessageProducer');

chai.use(chaiAsPromised);

const messageConsumer = new MessageConsumer();
const kafkaProducer = new KafkaProducer();
const idGenerator = new IdGenerator();
const messageProducer = new MessageProducer();

const timeout = 20000;
const topic = 'test-topic';
const eventAggregateType = 'Account';
const eventType = 'charge';

before(async () => {
  await kafkaProducer.connect();
});

after(async () => {
  await Promise.all([
    messageConsumer.disconnect(),
    kafkaProducer.disconnect()
  ]);
});

describe('MessageConsumer', function () {
  this.timeout(timeout);

  it('should ensureTopicExistsBeforeSubscribing()', async () => {
    const result = await messageConsumer.ensureTopicExistsBeforeSubscribing({ topics: [ topic ]});
    helpers.expectEnsureTopicExists(result);
  });

  it('should receive Kafka message', async () => {
    const subscriberId = 'test-sb-id';
    return new Promise(async (resolve, reject) => {
      const messageHandler = (message) => {
        console.log('messageHandler');
        console.log(message);
        // TODO: expect message
        resolve();
        return Promise.resolve();
      };

      try {
        await messageConsumer.subscribe({ subscriberId, topics: [ topic ], messageHandler });

        const messageId = await idGenerator.genIdInternal();
        const creationTime = new Date().getTime();
        const headers = messageProducer.prepareMessageHeaders(topic, { id: messageId, partitionId: 0, eventAggregateType, eventType });
        const message = JSON.stringify({
            payload: JSON.stringify({ message: 'Test kafka subscription' }),
            headers,
            offset: 5,
            partition: 0,
            highWaterOffset: 6,
            key: '0',
            timestamp: new Date(creationTime).toUTCString()
          });
        kafkaProducer.send(topic, message);
      } catch (err) {
        reject(err);
      }
    });
  });
});
