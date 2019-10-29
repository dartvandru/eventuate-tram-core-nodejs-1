const { expect } = require('chai');
const { insertIntoMessageTable } = require('../../lib/mysql/eventuateCommonDbOperations');
const MessageProducer = require('../../lib/MessageProducer');
const IdGenerator = require('../../lib/IdGenerator');

const idGenerator = new IdGenerator();
const messageProducer = new MessageProducer();

const expectEnsureTopicExists = (res) => {
  expect(res).to.be.an('Array');
  expect(res).lengthOf(2);
  const [ nodeInfo, metadataObj ] = res;
  expect(nodeInfo).to.be.an('Object');

  expect(nodeInfo).to.haveOwnProperty('0');

  expect(nodeInfo['0']).to.be.an('Object');
  expect(nodeInfo['0']).to.haveOwnProperty('nodeId');
  expect(nodeInfo['0']).to.haveOwnProperty('host');
  expect(nodeInfo['0']).to.haveOwnProperty('port');

  expect(metadataObj).to.haveOwnProperty('metadata');
  expect(metadataObj['metadata']).to.be.an('Object');
};

const putMessage = async (topic, payload, messageId) => {
  if (!messageId) {
    messageId = await idGenerator.genIdInternal();
  }
  return insertIntoMessageTable(messageId, payload, topic);
};

const expectEventId = (eventId) => {
  expect(eventId).to.be.a('String');
  expect(eventId).to.match(/^[0-9A-z]{16}-[0-9A-z]{16}$/);
};

const onlyUnique = (value, index, self) => {
  return self.indexOf(value) === index;
};

const expectDbMessage = (message, messageId, topic, payload) => {
  expect(message).to.be.an('Object');
  expect(message).to.haveOwnProperty('id');
  expect(message.id).eq(messageId);
  expect(message).to.haveOwnProperty('destination');
  expect(message.destination).eq(topic);
  expect(message).to.haveOwnProperty('headers');
  expect(message).to.haveOwnProperty('payload');
  expect(message.payload).eq(payload);
  expect(message).to.haveOwnProperty('published');
  expect(message).to.haveOwnProperty('creation_time');

  try {
    expectMessageHeaders(JSON.parse(message.headers));
  } catch (err) {
    throw err;
  }
};

const expectMessageHeaders = (headers, headersData) => {
  expect(headers).to.haveOwnProperty('ID');
  expect(headers.ID).to.be.a('String');

  expect(headers).to.haveOwnProperty('PARTITION_ID');
  expect(headers.PARTITION_ID).to.be.a('String');

  expect(headers).to.haveOwnProperty('DESTINATION');
  expect(headers.DESTINATION).to.be.a('String');

  expect(headers).to.haveOwnProperty('DATE');
  expect(headers.DATE).to.be.a('String');

  expect(headers).to.haveOwnProperty('event-aggregate-type');
  expect(headers['event-aggregate-type']).to.be.a('String');

  expect(headers).to.haveOwnProperty('event-type');
  expect(headers['event-type']).to.be.a('String');

  if (headersData) {
    expect(headers.ID).eq(headersData.id);
    expect(headers.DATE).eq(new Date(headersData.creationTime).toUTCString());
    expect(headers['event-aggregate-type']).eq(headersData.eventAggregateType);
    expect(headers.PARTITION_ID).eq(headersData.partitionId.toString());
    expect(headers['event-type']).eq(headersData.eventType);
    expect(headers.DESTINATION).eq(headersData.destination);
  }
};

const expectKafkaMessage = (message) => {
  expect(message).to.haveOwnProperty('topic');
  expect(message.topic).to.be.a('String');
  expect(message).to.haveOwnProperty('offset');
  expect(message.offset).to.be.a('Number');
  expect(message).to.haveOwnProperty('partition');
  expect(message.partition).to.be.a('Number');
  expect(message).to.haveOwnProperty('highWaterOffset');
  expect(message.highWaterOffset).to.be.a('Number');
  expect(message).to.haveOwnProperty('key');
  expect(message).to.haveOwnProperty('timestamp');
  expect(message.timestamp).to.be.a('Date');

  expect(message).to.haveOwnProperty('value');
  expect(message.value).to.be.a('String');

  try {
    const parsedValue = JSON.parse(message.value);
    expect(parsedValue).to.haveOwnProperty('payload');
    expect(parsedValue).to.haveOwnProperty('headers');
    expectMessageHeaders(parsedValue.headers);
  } catch (err) {
    throw err;
  }
};

const expectMessageForDomainEvent = (message, payload) => {
  expect(message).to.haveOwnProperty('payload');
  expect(message.payload).to.be.a('String');
  if (typeof (payload === 'object')) {
    payload = JSON.stringify(payload);
  }
  expect(message.payload).eq(payload);

  expect(message).to.haveOwnProperty('headers');
  expectMessageHeaders(message.headers);
};

const fakeKafkaMessage = async (topic, eventAggregateType, eventType, payload) => {
  const timestamp = new Date().toUTCString();
  const messageId = await idGenerator.genIdInternal();
  const headers = messageProducer.prepareMessageHeaders(topic, { id: messageId, partitionId: 0, eventAggregateType, eventType });
  return JSON.stringify({
    payload: payload || 'Fake message',
    headers,
    offset: 5,
    partition: 0,
    highWaterOffset: 6,
    key: '0',
    timestamp,
    swimlane: 0
  })
};

module.exports = {
  expectEnsureTopicExists,
  putMessage,
  expectEventId,
  onlyUnique,
  expectDbMessage,
  expectMessageHeaders,
  expectKafkaMessage,
  expectMessageForDomainEvent,
  fakeKafkaMessage
};