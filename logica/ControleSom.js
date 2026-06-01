export class ControleSom {

    constructor(){

        this.musica = new Audio("./sons/background.mp3");
        this.helice = new Audio("./sons/helice.mp3");

        this.musica.loop = true;
        this.helice.loop = true;

        this.musica.volume = 0.2;
        this.helice.volume = 0.1;
    }

    iniciar(){
        this.musica.play();
        this.helice.play();
    }

    atualizar(velocidade){
        const fator = velocidade / 15;
        this.helice.volume = 0.05 + fator * 0.3;
    }
}