export class Parser{
    constructor(){}

    static cache = {}; // global

    /**
     * Carrega OBJ e MTL associados
     * @param {string} url Caminho do OBJ
     * @returns {Promise<Object>}
     */
    async loadOBJWithMTL(url){

        // já carregado?
        if(Parser.cache[url]){
            return Parser.cache[url];
        }

        const obj = await (await fetch(url)).text();
        const parts = this.parseOBJ(obj);

        let mtl=null;
        for(let l of obj.split("\n")){
            if(l.startsWith("mtllib")) {
                mtl=l.split(/\s+/)[1];
            }
        }

        let materials={};

        if(mtl){
            const base=url.substring(0,url.lastIndexOf("/")+1);
            const txt=await (await fetch(base+mtl)).text();
            materials = this.parseMTL(txt);
        }

        const result = {parts, materials};

        // salva no cache
        Parser.cache[url] = result;

        return result;
    }

    /**
    * Faz parsing de arquivo OBJ
    * @param {string} text Conteúdo do OBJ
    * @returns {Object} Partes do modelo separadas por material
    */
    parseOBJ(text) {
        const pos=[[0,0,0]], uv=[[0,0]], nor=[[0,0,1]];
        let currentMat="default";

        this.parts={}; 
        this.maps={};

        this.newPart(currentMat);

        for(let line of text.split("\n")){
            line=line.trim();
            if(!line || line.startsWith("#")) continue;

            const p=line.split(/\s+/);

            if(p[0]=="v") pos.push([+p[1],+p[2],+p[3]]);
            else if(p[0]=="vt") uv.push([+p[1],+p[2]]);
            else if(p[0]=="vn") nor.push([+p[1],+p[2],+p[3]]);

            else if(p[0]=="usemtl"){
                currentMat=p[1];
                if(!this.parts[currentMat]) this.newPart(currentMat);
            }

            else if(p[0]=="f"){
                const v=p.slice(1);

                for(let i=1;i<v.length-1;i++){
                    const tri=[v[0], v[i], v[i+1]];

                    for(let vert of tri){
                        const map=this.maps[currentMat];

                        if(!map.has(vert)){

                            const partsIdx = vert.split("/");

                            const vi = partsIdx[0];
                            const ti = partsIdx[1] && partsIdx[1] !== "" ? partsIdx[1] : null;
                            const ni = partsIdx[2] && partsIdx[2] !== "" ? partsIdx[2] : null;

                            const position = pos[vi];
                            const tex = ti ? uv[ti] : [0,0];
                            const normal = ni ? nor[ni] : [0,0,1];

                            const part = this.parts[currentMat];

                            part.position.push(...position);

                            // 🔥 CORREÇÃO UV (flip Y)
                            part.texcoord.push(tex[0], tex[1]);

                            part.normal.push(...normal);

                            map.set(vert, part.position.length / 3 - 1);
                        }

                        this.parts[currentMat].indices.push(this.maps[currentMat].get(vert));
                    }
                }
            }
        }

        return this.parts;
    }
    newPart(m){
        this.parts[m]={position:[],texcoord:[],normal:[],indices:[]};
        this.maps[m]=new Map();
    }
    /**
     * Faz parsing de arquivo MTL
     * @param {string} text Conteúdo do MTL
     * @returns {Object} Materiais
     */
    parseMTL(text) {
        const mats={};
        let cur=null;

        for(let line of text.split("\n")){
            line=line.trim();
            if(!line || line.startsWith("#")) continue;

            const p=line.split(/\s+/);

            if(p[0]=="newmtl"){
                cur={};
                mats[p[1]]=cur;
            }
            else if(p[0]=="map_Kd"){
                cur.map_Kd=p.slice(1).join(" ");
            }
        }

        return mats;
    }
}
