export class ControleSom {
    constructor(){
        this.musica1 = new Audio("");
    }

    musica(){
        this.play(this.musica1);
    }

    tocar(tiposom){
        if(tiposom == "musica") this.musica();
    }
    play(audio) {
        const clone = audio.cloneNode();
        clone.volume = 0.35;
        clone.play();
    }
    playRandPlaybackRate(audio) {
        const clone = audio.cloneNode();
        clone.volume = 0.35;
        clone.playbackRate = Math.random() + 0.5;
        clone.play();
    }
}