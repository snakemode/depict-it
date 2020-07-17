export const TimerBar = {
    props: ['countdown'],     
    data: function() {
      return {
        timeRemaining: null,
        countdownTimer: null
      }
    },  
    
    computed: {
      seconds: function() {
        return Math.floor(this.timeRemaining / 1000);
      },
      percentage: function() {
        return Math.floor( this.timeRemaining / (this.countdown / 100));
      }
    },

    created: function () {      
      this.timeRemaining = this.countdown;

      this.countdownTimer = setInterval(() => {
        this.timeRemaining -= 1000;

        if (this.timeRemaining <= 0) {
          this.timeRemaining = null;
          clearInterval(this.countdownTimer);
        }
      }, 1000);      

    },
   

    template: `   
<div v-if="timeRemaining != null">
    Time left: {{ seconds }} {{ percentage }}
</div>
`
};