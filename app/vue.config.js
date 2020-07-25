import { DrawableCanvas } from "./js/components/base-components/DrawableCanvas.js";
import { CopyableTextBox } from "./js/components/base-components/CopyableTextBox.js";

import { InviteLink } from "./js/components/InviteLink.js";
import { StackItem } from "./js/components/StackItem.js";
import { TimerBar } from "./js/components/TimerBar.js";

import { ReadyOrWaitingPrompt } from "./js/components/ReadyOrWaitingPrompt.js";
import { ConnectedPlayersSummary } from "./js/components/ConnectedPlayersSummary.js";
import { CreateGameForm } from "./js/components/CreateGameForm.js";
import { Playfield } from "./js/components/Playfield.js";

export default function() {
    Vue.component('DrawableCanvas', DrawableCanvas);
    Vue.component('StackItem', StackItem);
    Vue.component('TimerBar', TimerBar);
    Vue.component('CopyableTextBox', CopyableTextBox);
    Vue.component('InviteLink', InviteLink);
    Vue.component('ReadyOrWaitingPrompt', ReadyOrWaitingPrompt);
    Vue.component('ConnectedPlayersSummary', ConnectedPlayersSummary);
    Vue.component('CreateGameForm', CreateGameForm);
    Vue.component('Playfield', Playfield);
}