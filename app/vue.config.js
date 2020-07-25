import { DrawableCanvas } from "./js/components/base-components/DrawableCanvas.js";
import { CopyableTextbox } from "./js/components/base-components/CopyableTextBox.js";

import { InviteLink } from "./js/components/InviteLink.js";
import { StackItem } from "./js/components/StackItem.js";
import { TimerBar } from "./js/components/TimerBar.js";
import { ReadyOrWaitingPrompt } from "./js/components/ReadyOrWaitingPrompt.js";

export default function() {
    Vue.component('drawable-canvas', DrawableCanvas);
    Vue.component('stack-item', StackItem);
    Vue.component('timer-bar', TimerBar);
    Vue.component('copyable-text-box', CopyableTextbox);
    Vue.component('invite-link', InviteLink);
    Vue.component('ready-or-waiting-prompt', ReadyOrWaitingPrompt);
}