const chai = require('chai');
const { expect } = chai;
const chaiAsPromised = require('chai-as-promised');
const helpers = require('./lib/helpers');
const { MessageConsumer, DefaultDomainEventNameMapping, DefaultChannelMapping, MessageProducer, DomainEventDispatcher, DomainEventPublisher } = require('../');

chai.use(chaiAsPromised);

const channelMapping = new DefaultChannelMapping(new Map());
const domainEventNameMapping = new DefaultDomainEventNameMapping();
const messageProducer = new MessageProducer({ channelMapping });
const domainEventPublisher = new DomainEventPublisher({ messageProducer });
const messageConsumer = new MessageConsumer();

const aggregateType = 'Account';
const aggregateId = 'Fake_aggregate_id';
const eventType = 'CreditApproved';
const event = { amount: 10, _type: eventType };
const eventDispatcherId = 'test-domain-event-dispatcher-id';
const timeout = 20000;

let extraHeaders = {};

describe('DomainEventDispatcher', function () {
  this.timeout(timeout);

  it('should dispatch an event', async () => {
    return new Promise(async (resolve) => {

      const domainEventHandlers = {
        [aggregateType]: {
          [eventType]: (message) => {
            console.log('handled message', message);
            resolve();
          }
        }
      };

      const domainEventDispatcher = new DomainEventDispatcher({ eventDispatcherId,
        domainEventHandlers,
        messageConsumer,
        domainEventNameMapping
      });
      await domainEventDispatcher.initialize();
      await domainEventPublisher.publish(aggregateType, aggregateId, [ event ], { extraHeaders });
    });
  });
});
