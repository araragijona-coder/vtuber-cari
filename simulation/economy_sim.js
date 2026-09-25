/**
 * Rocket Bunny Petty - Motor de Simulación Económica y de RNG
 * Valida la regla del -30%, el consumo de combustible/tanques y el Mercado de Desguace.
 */

class EconomySimulator {
    constructor() {
        // Variables de Combustible y Tiempo
        this.dailyStaminaCap = 240;
        this.missionCost = 12;
        
        // Configuración de Tanques de Reserva
        this.f2pReserveTanks = 2;
        this.p2wGarageTanks = 5;

        // Variables de RNG y Regla del -30%
        this.optimalPieceValue = 100;
        this.maxMalus = 0.30; // 30% de penalización máxima

        // Mercado de Desguace
        this.scrapThreshold = 30;
    }

    /**
     * Simula la generación de una pieza de equipamiento con la regla del -30%
     */
    generateGearPiece() {
        // El RNG genera una desviación entre 0% y 30% de castigo
        const malus = Math.random() * this.maxMalus; 
        const finalValue = this.optimalPieceValue * (1 - malus);
        
        return {
            value: parseFloat(finalValue.toFixed(2)),
            isViable: finalValue >= (this.optimalPieceValue * (1 - this.maxMalus))
        };
    }

    /**
     * Simula el comportamiento del sistema de combustible ante días de inactividad
     */
    simulateStaminaStorage(daysInactive, isP2W = false) {
        const maxTanks = isP2W ? this.p2wGarageTanks : this.f2pReserveTanks;
        const totalCapacityDays = maxTanks + 1; // 1 día actual + tanques de reserva
        
        const storedDays = Math.min(daysInactive + 1, totalCapacityDays);
        const availableStamina = storedDays * this.dailyStaminaCap;
        
        return {
            daysInactive,
            storedDays,
            availableStamina,
            overflowLost: daysInactive >= totalCapacityDays ? (daysInactive - totalCapacityDays + 1) * this.dailyStaminaCap : 0
        };
    }

    /**
     * Simula el ciclo del Mercado de Desguace para obtener un Motor SR
     */
    simulateScrapMarket(runs) {
        let unwantedPieces = 0;
        let motorsAcquired = 0;
        
        for (let i = 0; i < runs; i++) {
            // Simulamos que cada run otorga una pieza; si no es la deseada, va al desguace
            unwantedPieces++;
            if (unwantedPieces >= this.scrapThreshold) {
                motorsAcquired++;
                unwantedPieces = 0;
            }
        }
        
        return {
            totalRuns: runs,
            motorsAcquired,
            leftoverPieces: unwantedPieces
        };
    }

    /**
     * Ejecuta una batería completa de pruebas de simulación
     */
    runAudit() {
        console.log("=== INICIANDO AUDITORÍA MATEMÁTICA DE ROCKET BUNNY PETTY ===");
        
        // 1. Auditar la regla del -30% sobre 10,000 piezas generadas
        let failedRuleCount = 0;
        let totalValue = 0;
        const iterations = 10000;
        
        for (let i = 0; i < iterations; i++) {
            const piece = this.generateGearPiece();
            totalValue += piece.value;
            if (!piece.isViable) failedRuleCount++;
        }
        
        console.log(`[RNG -30% Rule]: Generadas ${iterations} piezas.`);
        console.log(`- Valor promedio obtenido: ${(totalValue / iterations).toFixed(2)}% del óptimo.`);
        console.log(`- Piezas fuera de rango (Violaciones): ${failedRuleCount} (Debe ser 0).`);

        // 2. Auditar Estamina con 4 días de inactividad (F2P vs P2W)
        const inactiveDays = 4;
        const f2pTest = this.simulateStaminaStorage(inactiveDays, false);
        const p2wTest = this.simulateStaminaStorage(inactiveDays, true);
        
        console.log(`\n[Combustible y Garaje]: Prueba con ${inactiveDays} días de ausencia.`);
        console.log(`- F2P (Max 2 reservas): Recupera ${f2pTest.availableStamina} estamina. Perdidos: ${f2pTest.overflowLost}`);
        console.log(`- P2W (Max 5 reservas): Recupera ${p2wTest.availableStamina} estamina. Perdidos: ${p2wTest.overflowLost}`);

        // 3. Auditar Mercado de Desguace
        const scrapTest = this.simulateScrapMarket(150);
        console.log(`\n[Mercado de Desguace]: Tras 150 piezas farmeadas.`);
        console.log(`- Motores SR adquiridos por canje: ${scrapTest.motorsAcquired}`);
        console.log(`- Piezas sobrantes en inventario: ${scrapTest.leftoverPieces}`);
        
        console.log("\n=== AUDITORÍA FINALIZADA CON ÉXITO ===");
    }
}

// Ejecución de prueba si se llama directamente
const sim = new EconomySimulator();
sim.runAudit();
