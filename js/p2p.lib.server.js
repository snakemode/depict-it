class P2PServer {
    constructor(identity, uniqueId, ably) {
      this.identity = identity;
      this.uniqueId = uniqueId;
      this.ably = ably;

      this.state = { players: [] };
    }
     
    async connect() {
      await this.ably.connect(this.identity, this.uniqueId);
    }

    async sendWordsAcrossMultipleMessages() {
      const phrase = "I spend a lot of time travelling and talking to developers, and I've been a front-end developer for about seven years, and I've worked in many different sectors from small start-ups to big organisations, from charities to agencies, from the Civil Service to attempting to be self-employed, and I'm bad at that because I'm bad at asking people to pay me! I'm also an organiser at Codebar where we teach underrepresented people in tech. I spend a lot of time talking to developers and designers, their teams from all seniority levels through many different walks of life. I've started to notice some trends, trends in behaviours, beliefs, and in complaints amongst people who work in the tech industry. To illustrate some of these, I would like to tell you a story about a friend of mine. Let's call her Mo. While I tell you about Mo, I would like to see if you recognise any of her behaviours in yourself. So, Mo is a web developer. She's got a few years experience under her belt and works in a team of other developers in a medium sized organisation. She went to uni like her teachers told her she should but feels she chose the wrong course, but at the time was too afraid to change because it was midway through, so instead graduated and reskilled. She taught herself with HTML and CSS with a view to becoming a web developer. Developer. She's had a niggling worry about her skills as a developer because she was self-taught. Sometimes, she doesn't know the correct names or techniques for the code she's writing but she doesn't want to ask her colleagues for help in case she lets on about the things she doesn't know. She's worried they will judge her, or, worse, they will fire her. She imagines the shock on their faces. \"You don't know that? That's so basic!\" She goes to tutorials, meet-ups, events, but feels like everyone else is getting the stuff that she finds she struggles with. There are people who are writing new and awesome frameworks and tools while she's still trying to learn the previous ones. Sometimes, she feels like a fraud. She follows a lot of web celebrities to help her stay up to date and amazed how the speakers at the events and the people she follows on social media, how much they are able to get done. They're creative geniuses. They know how to ask for them. Their days seem to have more hours than hers do. And they've all got side projects on the go as well. Mo has a few ideas for side projects, and some she can't seem to finish. She's worried people are going to judge her for being too unoriginal or simple so she never actually puts them in the public eye. She keeps tweaking them indefinitely. If she's honest, she doesn't want to face the side project. She's been sat at her computer all day at work, she doesn't want to sit in front of it when at home. Her worry about keeping up with everybody and feeling good enough bothers her in the work day. Sometimes, she's so worried she can't concentrate on what she's doing and then worried she's wasted time worrying. She works longer hours and takes shorter breaks, and she still hasn't asked for help because she doesn't want to give her secrets away. In order to, she starts to join more events and joining web-related organisations. People often tell her they don't know how she manages to fit it all in. She smiles and shrugs off their comments because they won't find out she's a fraud. When she gets home, she doesn't have the time or energy to deal with chores or see her real friend. Her diet has become quiet bad because she's eating so much pizza at these events and drinking more than she used to, but, you know, there's a free bar. Even though she gets to bed late, she can't sleep at night because she can't switch her brain off which likes to switch between her workload and the jobs she needs to do around the house. Her ability to concentrate at work continues to suffer. She procrastinates a lot instead of getting work done. She will write emails or check social media, anything that stops her getting down to start work. She panics because she feels she hasn't done enough in the day, and her daily stand-up meetings become a dread every morning because she is worried her team will be asking her if she's productive enough. Maybe they're going to fire her.".split(" ");
      const sleep = (ms) => (new Promise(resolve => setTimeout(resolve, ms)));

      for (let word of phrase) {
        this.ably.sendMessage({ kind: "word", word: word, serverState: this.state });
        await sleep(500);
      }
    }

    onReceiveMessage(message) {
      switch(message.kind) {
        case "connected": this.onClientConnected(message); break;
        default: () => { };
      }
    }

    onClientConnected(message) {
      this.state.players.push(message.metadata);
      this.ably.sendMessage({ kind: "connection-acknowledged", serverState: this.state }, message.metadata.clientId);
      this.ably.sendMessage({ kind: "peer-status", serverState: this.state });
    }  
}  

try {
  module.exports = { P2PServer };  
} catch { }
