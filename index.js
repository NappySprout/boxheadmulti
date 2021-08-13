//socket.js
const socket = io("https://boxheadmulti.herokuapp.com");
//localhost if local
//entity.js
let world = {players:[],bullets:[],enemies:[]}
let mapping = []
class Character {
    constructor(pos,radius,ctx,socket,socketIndex) {
      this.pos = pos // [x,y] 
      this.speed = [0,0]
      this.direction = [0,1]
      this.rad = radius
      this.ctx = ctx
      this.side = 2*radius
      this.color = "green"
      this.canShoot = false
      this.socket = socket
      this.socketIndex = socketIndex 
      this.invi = false
      this.health = 10
      this.charspeed = 3
    }
    move(){
        this.pos = this.pos.map((d,index)=>d+this.speed[index])
        if(this.socketIndex===-1)return;
        this.socket.emit("move",[this.socketIndex,    
        {
            pos:[this.pos[0],this.pos[1]],
            rad:this.rad,
            side:this.side,
            color:this.color
        }])
    }
    setSpeed(map){
        if (this.health===0)return;
        const vert = map["s"]-map["w"]
        const hori = map["d"]-map["a"]   
        if (hori!=0 || vert !=0){this.direction = [hori,vert]}
        this.speed = [hori*this.charspeed,vert*this.charspeed]     
    }
    isCollide(char){
        return char.pos.map((d,index)=>  (d-this.pos[index])**2  ).reduce((a, b) => a + b, 0) <= (char.rad + this.rad)**2 
    }
    drawCoord(){
        return [this.pos[0]-this.rad,this.pos[1]-this.rad,this.side,this.side]
    }
    draw(map){
        this.setSpeed(map)
        this.ctx.fillStyle = this.color
        this.move()
        this.ctx.fillRect(...this.drawCoord())    
    }
    shoot(map){
        if (this.health===0) return;
        if (map[" "]) this.canShoot = true 
        if (map[" "]===false && this.canShoot){
            this.socket.emit("shoot",new Bullet(this.pos,this.direction))
            this.canShoot = false
        } 
    }
    damage(world,healthEl){
        if(!this.invi&&world.enemies.find(enemy=>this.isCollide(enemy))){
            this.health = Math.max(this.health-1,0)
            healthEl.innerHTML = this.health
            this.invi = true
            this.color = "yellow"
            setTimeout(()=>{this.color="green";this.invi=false},1000)
        }
    }
  }
class Bullet {
    constructor(pos,direction){
        this.pos = pos
        this.speed = direction.map(x=>x*5)
        this.color = "black"
        this.rad = 10
        this.side = this.rad*2
    }
    move(){
        this.pos = this.pos.map((d,index)=>d+this.speed[index])
    }
}
//events
let map = {
    w:false,
    a:false,
    s:false,
    d:false,
    " ":false
}
document.addEventListener("keydown",e=>{
    if (e.key ==="w" && map[e.key]===false)map[e.key] = true
    if (e.key ==="s" && map[e.key]===false)map[e.key] = true
    if (e.key ==="a" && map[e.key]===false)map[e.key] = true
    if (e.key ==="d" && map[e.key]===false)map[e.key] = true
    if (e.key ===" " && map[e.key]===false)map[e.key] = true
})
document.addEventListener("keyup",e=>{
    if (e.key ==="w" && map[e.key]===true)map[e.key] = false
    if (e.key ==="s" && map[e.key]===true)map[e.key] = false
    if (e.key ==="a" && map[e.key]===true)map[e.key] = false
    if (e.key ==="d" && map[e.key]===true)map[e.key] = false
    if (e.key ===" " && map[e.key]===true)map[e.key] = false
})

//index
const canvas = document.getElementById("canvas")
const healthEl = document.getElementById("health")
const ctx = canvas.getContext("2d")
const WIDTH = 1000
const HEIGHT = 600
canvas.width = WIDTH
canvas.height = HEIGHT
let canSpawn = true
let isTicking = false
let level = 1
const clientDraw= (player)=>{
    ctx.fillStyle = player.color
    ctx.fillRect(player.pos[0]-player.rad,player.pos[1]-player.rad,player.side,player.side)
}
const clear = ()=>{
    ctx.fillStyle="white"
    ctx.fillRect(0,0,canvas.width,canvas.height)
}
clear()
let me = new Character([100,100],20,ctx,socket,-1)
socket.emit("init",
    {
        pos:me.pos,
        rad:me.rad,
        side:me.side ,
        color:me.color
    }
)
socket.on("updatePlayer",(data)=>{
    const [newWorld,newMapping] = data
    world = newWorld
    mapping = newMapping 
    me.socketIndex = mapping.indexOf(socket.id)
})
const loop = (timestamp)=>{
    clear()
    me.draw(map)
    me.damage(world,healthEl)
    me.shoot(map)
    if(me.socketIndex===0 && (world.bullets.length||world.enemies.length) ){//socketIndex ===0 is the master
        socket.emit("calculate")
    }
    if (me.socketIndex=== 0 && world.enemies.length===0&&!isTicking){
        isTicking=true
        setTimeout(  ()=>{socket.emit("wave",level);level +=1}  ,5000)
        setTimeout(  ()=>isTicking=false  ,6000)
    }
    world["players"].filter((player,index)=>index!=me.socketIndex).forEach(player=>clientDraw(player))
    world["bullets"].forEach(bullet=>clientDraw(bullet))
    world["enemies"].forEach(enemy=>clientDraw(enemy))
    window.requestAnimationFrame(loop)
}
window.requestAnimationFrame(loop)
