;Game Snake


;TRENUTNO JE NASTAVLJENO ZA 64KHZ !!!!

JMP main
JMP casovnePrekinitev

DW 0;Prostor od 0010 do 00ff je namenjen za shranjevanje.

ORG 0x0100

zKace: DW 0
kKace: DW 0
random: DW 0
doseg: DW 0
zadnjaTipka: DW 0x0064

main:
    MOV SP,0x0EDF
    CALL setup		;Zaženi vse potrebne funkcije
    CALL nastaviUspeh
    JMP nastavljanjeCasovnePrekinitve

konec:				;Konec vsega.
	HLT


setup:				;Nastavi parametre.
  MOV [kKace],0x0010
  MOV [zKace],0x0011
  MOVB [0x0F76],255
  MOVB [0x0F77],255
  MOVB [0x0010],0x76
  MOVB [0x0011],0x77
  MOVB [0x0F7d],0xc0
  RET
  
  
nastavljanjeCasovnePrekinitve: ;Nastavljanje prekinitve
	MOV A, 15000	;Hitrost kače
	OUT 3
	MOV A, 2
    OUT 0
    STI
    JMP konec

casovnePrekinitev:				;Izvedba prekinitve.
	PUSH A
	MOV A, 2
    OUT 2
    POP A
    CALL premakniKaco
	IRET

premakniKaco:			;Ta funkcija preveri, kaj je uporabnik kliknil in z izbrano tipko se kača premakne.
 
    MOV B,[zKace]		;Nastavi kazalec v register B.
    MOVB BL,[B]
    ADD B,0x0f00
    
    MOV D,B				;Pripravi za preverjanje klika.
    SHL D,12
    SHR D,12
    IN 6
    
    preverjanje:    	;Preveri kaj je uporabnik kliknil.
      CMP A,'w'
      JE gor
      CMP A,'s'
      JE dol
      CMP A,'a'
      JE levo
      CMP A,'d'
      JE desno
      CMP A,'p'		
      JE konecFunkcije	;Ob pritisku p-ja pavziraj igro.
      CMP A,'r'		
      JE resetirajIgro	;Ob pritisku r-ja resitiraj igro.
    
    MOV A,[zadnjaTipka]			;Premakni v "zadnjaTipka" trenuten klik.
    JMP preverjanje
    
    gor: 						;Vsaka naslednja funkcija se izvede ob pritisku določenega gumba.
    	CMP B,0x0f10
        JB	gorP
    	SUB B,16
    	JMP premikZacetka
    dol: 
    	CMP B,0x0ff0
        JAE dolP
    	ADD B,16
    	JMP premikZacetka
    levo: 
    	CMP D,0x0000
        JE levoP
    	DEC B
    	JMP premikZacetka
    desno: 
    	CMP D,0x000f
        JE desnoP
    	INC B
        JMP premikZacetka
    gorP: 						;Naslednje štiri funkcije so pomožne funkcije, pritiska določenega gumba.
    	ADD B,240
    	JMP premikZacetka
    dolP: 
    	SUB B,240
    	JMP premikZacetka
    levoP: 
    	ADD B,15
    	JMP premikZacetka
    desnoP: 
    	SUB B,15
    
    premikZacetka:				;Ta funkcija je zadolžena za grafičen premik kače in preverjanje, kaj je pred kačo.
    
    	MOV [zadnjaTipka],A
        
        MOV A,[zKace]			;Premakni pointer glave in repa kače če so pogoji izpolnjeni.
        INC A
        
        CMP A,0x0100			
        JE zKaceF
        MOV [zKace],A
        JMP zKaceFN
        
        zKaceF:
            MOV A,0x0010
            MOV [zKace],A
        
        zKaceFN:
        MOVB [A],BL
        MOVB DL,[B]
        
        CMPB DL,0xff			;Preveri če se je kača zaletela.
        	JE konecIgre
        CMPB DL,0xc0			;Preveri če je pred kačo jabolko.
        	JE povecajK
        JMP nePovecajK
        povecajK:
        	CALL pKaco
        nePovecajK:
        MOVB [B],0xff			;Grafično premakni glavo.
        
        MOV B,0					;Pridobi pointer repa.
        MOV D,[kKace]
        MOVB BL,[D]
        ADD B,0x0f00
        MOVB [B],0				;Grafično premakni rep.

        INC D					;Premakni pointer repa.
        CMP D,0x0100
		JE kKaceF
        MOV [kKace],D
        JMP kKaceFN
        kKaceF:
            MOV [kKace],0x0010
        kKaceFN:
       
       
        MOV C,0				;Nekako naredi random številko.
        
        MOV A,[random]
        ADD A,B
        ADD A,C
        ADD A,[zadnjaTipka]
        MOV [random],A
        
          
konecFunkcije:				;Konec funkcije.
	RET
    
    
pKaco:						;Ta funkcija poskrbi za povečanje kače.
	
    MOV A,[kKace]			;Pointer konca kače premakni v A.
    
    CMP A,0x0010			;Preveri, kje je bil prejšnji pointer.
    JE skociC
    DEC A
    JMP neSkoci
    skociC:
    	MOV A,0x00ff
    neSkoci:
    
    MOV [kKace],A			;Premakni trenuten pointer za eno mesto nazaj.
	CALL dodajH				;Ko se vse izvede, pokliče funkcijo dodaj hrano.
	RET
    
    
    
dodajH:						;Ta funkcija je zadolžena za dodajanje nove hrane (jabolka).

	PUSH A					;Premakni potrebne registre v stack.
    PUSH B
    PUSH C
    
    MOV B,0					;Generiraj random stevilko med 1 in ff.
    MOV B,[random]
    
    loopR:
        SHR B,4
        CMP B,0x00fe
        JA loopR
        
    ADD B,0x0f00			;Nastavi pointer hrane glede na random št.
   	
	loopZaDH:				;Preverjaj, če kača obstaja na izbranem pointerju in v primeru, da obstaja povečaj pointer za 1.
    	INC B
        MOVB AL,[B]
        CMPB AL,0xff
        JE loopZaDH
        CMPB AL,0xc0
        JE loopZaDH

        
	MOVB [B],0xc0			;Grafično prikaži hrano.
	    
   	CALL posodobiUspeh		;Pokliči funkcijo posodibi uspeh.
    
    POP C
    POP B
    POP A
RET

nastaviUspeh:				;Ta funkcija je zadolžena za nastavitev malega črkovnega zaslona.
    MOV [0x0ee0],0x5573
    MOV [0x0ee2],0x7065
    MOV [0x0ee4],0x683A
    MOV [0x0ee6],0x3030
    MOV [0x0ee8],0x3030
RET

posodobiUspeh:				;Ta funkcija posodobi št. pojetih jabolk.
    MOV A,[doseg]
    INC A
    MOV [doseg],A
    CALL to_dec				;Poklic funkcije, ki prevede hex v dec in izpiše le to na črkovnem zaslonu.
RET   
    
    

konecIgre:						;Nastavi vse za konec igre: mali zaslon spremeni tako, da doda "Konec" in stik kače spremeni v svetlo rdečo barvo.
	MOVB [B],0xee
    
    MOV D,0x0ee0
    MOV C,0x0ef0
    
    loopPremikCrk:			;Premik zgornjega črkovnega zaslona v spodnji.
      MOV A,[D]
      MOV [C],A
      MOV [D],0
      ADD C,2
      ADD D,2
      CMP D,0x0ef0
      JB loopPremikCrk
    
    MOV [0x0ee0],0x4b6f		;Nastavitev napisa "Konec!!!".
    MOV [0x0ee2],0x6e65
    MOV [0x0ee4],0x6321
    MOV [0x0ee6],0x2121
	JMP konec
    
resetirajIgro:	;Pripravi za ponovno igro.
	MOV [doseg],0
	MOV A,0x0eff
    restartLoop:
    	INC A
        MOVB [A],0
    	CMP A,0x0fff
        JB restartLoop
	CALL setup
    CALL nastaviUspeh
    JMP konecFunkcije

to_dec:						;Nimam pojma, kaj se tukaj dogaja, ker sem napisal funkcijo pred enim mesecem.
	MOV B,0					;V glavnem funkcija prevede hex v dec in izpiše na mesto "0x0EE5-0x0EE9" v črkovnem displayu.
    CMP A,9999
    JNA dec
    MOV [0x0EE0],0x4572
    MOV [0x0EE2],0x726F
    MOV [0x0EE4],0x7200
    JMP praviKonec

dec:
    CMP A,1000
    JAE vecKot1000
    CMP A,100
    JAE vecKot100
    CMP A,10
    JAE vecKot10
    JMP predIzpis
decPonovi:
    MOV C,B
    SHL C,4
    SHR C,12
	CMP C,0x000A
    JE premakniA00
    MOV C,B
    SHL C,8
    SHR C,12
	CMP C,0x000A
    JE premakni0A0
    MOV C,B
    SHL C,12
    SHR C,12
	CMP C,0x000A
    JE premakni00A
    JMP dec

vecKot10:
    SUB A,10
    ADD B,0x00010  
    JMP decPonovi
vecKot100:
    SUB A,100
    ADD B,0x0100
    JMP decPonovi
vecKot1000:
    SUB A,1000
    ADD B,0x1000
    JMP decPonovi
    
premakni00A:
	ADD B,0x0006
    JMP decPonovi
premakni0A0:
	ADD B,0x0060
    JMP decPonovi
premakniA00:
	ADD B,0x0600
    JMP decPonovi

predIzpis:
	ADD B,A
    MOV D,0x0EE9
	MOV C,12
izpisi:
    MOV A,B
	SHL A,C
    SHR A,12
    ADD A,48
    MOVB [D],AL
    DEC D
    CMP C,0
    JE praviKonec
    SUB C,4
    JMP izpisi
praviKonec:
	RET
    
    
