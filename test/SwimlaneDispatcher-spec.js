const chai = require('chai');
const { expect } = chai;
const chaiAsPromised = require('chai-as-promised');
const helpers = require('./lib/helpers');
const MessageConsumer = require('../lib/kafka/MessageConsumer');
const SwimlaneDispatcher = require('../lib/kafka/SwimlaneDispatcher');
const KafkaProducer = require('../lib/kafka/KafkaProducer');

chai.use(chaiAsPromised);

const messageConsumer = new MessageConsumer();
const kafkaProducer = new KafkaProducer();

const timeout = 20000;
const topic = 'test-topic';
const eventAggregateType = 'Account';
const eventType = 'charge';
const expectedProcessedMessagesNum = 9;

before(async () => await kafkaProducer.connect());

after(async () => {
  await Promise.all([
    messageConsumer.disconnect(),
    kafkaProducer.disconnect()
  ]);
});

describe('SwimlaneDispatcher', function () {
  this.timeout(timeout);

  it('should dispatch a message', async () => {
    const subscriberId = 'test-sb-id';

    return new Promise(async (resolve, reject) => {
      let processedNum = 0;
      const messagesBySwimlane = {
        0: [ 100, 5, 10 ],
        // 1: [ 5, 10, 100 ]
      };

      const messageHandlers = {
        [topic]: (message) => {
          console.log('Processing queue message:', message);

          return Promise.resolve()
            .then(() => {
              console.log('--------------------------------');
              console.log('DISPATCHED');
              processedNum++;
              if (processedNum >= expectedProcessedMessagesNum) {
                resolve();
              }
            });
        }
      };

      const swimlaneDispatcher = new SwimlaneDispatcher({ messageHandlers });
      const messageHandler = (message) => {
        swimlaneDispatcher.dispatch(message);
      };

      try {
        await messageConsumer.subscribe({ subscriberId, topics: [ topic ], messageHandler });

        const messages = await Promise.all(
          Object.keys(messagesBySwimlane)
          .reduce((acc, swimlane) => {
            messagesBySwimlane[swimlane].forEach((m) => {
              acc.push(helpers.fakeKafkaMessage({ topic, eventAggregateType, eventType, partition: swimlane, payload: m }));
            });
            return acc;
          }, [])
        );
        console.log('messages:', messages);
        // messages.forEach(message => kafkaProducer.send(topic, message, message.partition));
      } catch (err) {
        reject(err);
      }
    });
  });
});
