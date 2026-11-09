"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { projectRoot } = require("./module-test-helpers.cjs");

/** Loads the classic-worker factory with a deterministic ID adapter.
 * @returns {object} Factory and normalization operations in the current realm.
 */
function fixture() {
  const context = { Date, Number, String, Array, Object, TypeError };
  vm.runInNewContext(fs.readFileSync(path.join(projectRoot,"js/worker/dm-models.js"),"utf8"), context);
  let serial = 0;
  return { factory: context.createThreadlineDmModels, models: context.createThreadlineDmModels({ randomUUID: () => `generated-${++serial}` }) };
}

/** Copies cross-realm model values into plain local JSON data.
 * @param {unknown} value - Serializable model.
 * @returns {unknown} Local value.
 */
function plain(value) { return JSON.parse(JSON.stringify(value)); }

test("DM worker model API is frozen, explicit and generates IDs only when missing", () => {
  const { factory,models: m } = fixture();
  assert.throws(() => factory(), /randomUUID/); assert.throws(() => factory({ randomUUID: true }), /randomUUID/);
  assert.equal(Object.isFrozen(m), true);
  assert.equal(Object.keys(m).length, 7);
  assert.equal(m.normalizeDmMessageEntity({ id: "existing" }).id,"existing");
  assert.equal(m.normalizeDmConversationEntity({ convoId: "existing" }).id,"existing");
  assert.equal(m.normalizeDmMessageEntity().id,"generated-1");
  assert.equal(m.normalizeDmConversationEntity().id,"generated-2");
});

test("DM date filters retain inclusive UTC day boundaries and reject absent/invalid dates", () => {
  const { models: m } = fixture();
  assert.equal(m.normalizeDmDateFilterValue("2026-10-19"),Date.parse("2026-10-19T00:00:00.000Z"));
  assert.equal(m.normalizeDmDateFilterValue("2026-10-19",true),Date.parse("2026-10-19T23:59:59.999Z"));
  assert.equal(m.normalizeDmDateFilterValue("2024-02-29",true)-m.normalizeDmDateFilterValue("2024-02-29"),86399999);
  for (const value of ["",null,undefined,"invalid","2026-13-40"]) assert.equal(m.normalizeDmDateFilterValue(value),null);
  assert.deepEqual(plain(m.normalizeDmFilters()),{ participantDid:"",from:"",to:"" });
  assert.deepEqual(plain(m.normalizeDmFilters({ participantDid:" did:peer ",from:2026,to:"date" })),{ participantDid:"did:peer",from:"2026",to:"date" });
});

test("DM conversation excludes self, preserves group rules, aliases and timestamps", () => {
  const { models: m } = fixture();
  const raw = { id:"one",rev:"r",name:"Team",unreadCount:"3",createdAt:"created",updatedAt:"updated",lastMessage:{sentAt:"sent"},
    members:[null,{}, {did:"self"},{did:"peer",handle:"peer.test"},{did:"other",displayName:"Other"}] };
  const result = m.normalizeDmConversationEntity(raw,"self");
  assert.equal(result.raw,raw); assert.equal(result.isGroup,true); assert.equal(result.participantCount,2);
  assert.deepEqual(plain(result.memberHandles),["peer.test","other"]);
  assert.equal(result.members[0].displayName,"peer.test"); assert.equal(result.unreadCount,3);
  assert.equal(result.lastMessageAt,"sent"); assert.equal(result.updatedAt,"updated");
  assert.equal(m.normalizeDmConversationEntity({members:[],isGroup:true}).isGroup,true);
  assert.equal(m.normalizeDmConversationEntity({members:"bad"}).participantCount,0);
  assert.equal(m.normalizeDmConversationEntity().isGroup,false);
});

test("DM embed candidates retain envelope order, duplicates and malformed array behavior", () => {
  const { models: m } = fixture(); const embed={ external:{uri:"https://example.test"} };
  const message={ embed,embeds:[embed,null],message:{card:{id:1}},record:{embeds:"bad"},content:{link:{id:2}} };
  const result=m.collectDmEmbeds(message);
  assert.deepEqual(plain(result),plain([message,embed,embed,message.message,message.message.card,message.record,message.content,message.content.link]));
  assert.equal(result[0],message); assert.equal(result[1],result[2]);
  assert.equal(m.collectDmEmbeds().length,1);
});

test("DM facets choose the first nonempty valid array without copying it", () => {
  const { models: m } = fixture(); const first=[{id:1}]; const second=[{id:2}];
  assert.equal(m.collectDmFacets({facets:first,message:{facets:second}}),first);
  assert.equal(m.collectDmFacets({facets:[],message:{facets:"bad"},record:{facets:second}}),second);
  assert.equal(m.collectDmFacets({ content:{facets:first} }),first);
  assert.deepEqual(plain(m.collectDmFacets()),[]);
});

test("DM external cards preserve wrapper and thumbnail priority and nested fallbacks", () => {
  const { models:m }=fixture();
  const thumb={url:" https://example.test/image "};
  const card=m.extractDmExternalCardFromEmbedSw({external:{uri:" https://example.test ",title:" Title ",description:" Text ",thumb},card:{url:"ignored"}});
  assert.deepEqual(plain(card),{url:"https://example.test",title:"Title",description:"Text",thumb:"https://example.test/image",thumbRef:thumb});
  assert.equal(card.thumbRef,thumb);
  assert.equal(m.extractDmExternalCardFromEmbedSw({media:{link:{url:"nested",thumbnail:" raw "}}}).thumb," raw ");
  assert.equal(m.extractDmExternalCardFromEmbedSw({embeds:[null,{}, {card:{url:"second"}}]}).url,"second");
  for (const value of [null,undefined,1,"text",{}]) assert.equal(m.extractDmExternalCardFromEmbedSw(value),null);
  assert.equal(m.extractDmExternalCardFromEmbedSw({media:{},embeds:[{url:"ignored"}]}),null);
});

test("DM messages retain sender/text aliases, raw identity and unenriched asset fields", () => {
  const { models:m }=fixture();
  const raw={msgId:"alias",createdAt:"date",author:{did:"peer",handle:"peer.test",avatar:"avatar"},message:{text:"<b>literal</b>",facets:[{id:1}]}};
  const result=m.normalizeDmMessageEntity(raw,"conversation");
  assert.equal(result.id,"alias"); assert.equal(result.convoId,"conversation"); assert.equal(result.text,"<b>literal</b>");
  assert.equal(result.sentAt,"date"); assert.equal(result.senderDid,"peer"); assert.equal(result.senderDisplayName,"peer.test");
  assert.equal(result.raw,raw); assert.equal(result.externalCard,null); assert.equal(result.senderAvatarPath,"");
  assert.equal(result.facets,raw.message.facets); assert.equal(result.embeds[0],raw);
  assert.equal(m.normalizeDmMessageEntity({senderDid:"fallback",text:42}).text,"42");
  assert.equal(m.normalizeDmMessageEntity({senderDid:"fallback"}).senderDid,"fallback");
  assert.throws(()=>m.normalizeDmMessageEntity(null)); assert.throws(()=>m.normalizeDmFilters(null));
});
