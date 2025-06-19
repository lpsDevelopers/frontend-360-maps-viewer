import {Injectable, OnDestroy} from '@angular/core';
import {StoredPanoramasService} from "../storedPanoramas/stored-panoramas.service";
import {Panorama} from "../../../Model/types";
import {BehaviorSubject, Observable, Subscription} from "rxjs";

export interface PanoramaDirection {
  panorama: Panorama;
  distance: number;
  bearing: number;
  direction: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
  isInViewAngle: boolean;
  confidence: number  ; // Confianza de que es la dirección correcta
}

export interface NavigationContext {
  current: Panorama;
  nearest: PanoramaDirection[];
  ahead: PanoramaDirection | null;
  behind: PanoramaDirection | null;
  left: PanoramaDirection | null;
  right: PanoramaDirection | null;
  viewingAngle: number;
}

// Cache para optimizar cálculos repetidos
interface DistanceCache {
  [key: string]: number;
}

interface ClusterNode {
  panorama: Panorama;
  connections: Map<number, number>; // id -> distance
}

@Injectable({
  providedIn: 'root'
})
export class GeoUtilsService implements OnDestroy {
  private allPanoramas: Panorama[] = [];
  private subscription: Subscription;
  private navigationContext$ = new BehaviorSubject<NavigationContext | null>(null);

  // Optimizaciones de rendimiento
  private distanceCache: DistanceCache = {};
  private spatialIndex: Map<string, Panorama[]> = new Map();
  private readonly GRID_SIZE = 0.001; // Tamaño de grid para índice espacial
  private readonly MAX_CLUSTER_DISTANCE = 0.01; // 10 metros aproximadamente
  private readonly MAX_SEARCH_RADIUS = 0.1; // 100 metros aproximadamente

  constructor(private storedPanoramasService: StoredPanoramasService) {
    this.subscription = this.storedPanoramasService.panoramas$.subscribe(
      panoramas => {
        this.allPanoramas = panoramas;
        this.clearCaches();
        this.buildSpatialIndex();
        this.optimizeSequentialOrder();
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.navigationContext$.complete();
    this.clearCaches();
  }

  getNavigationContext(): Observable<NavigationContext | null> {
    return this.navigationContext$.asObservable();
  }

  getAllPanoramas(): Panorama[] {
    return [...this.allPanoramas]; // Retorna copia para evitar mutaciones
  }

  /**
   * Construye un índice espacial para búsquedas más eficientes
   */
  private buildSpatialIndex(): void {
    this.spatialIndex.clear();

    for (const panorama of this.allPanoramas) {
      const gridKey = this.getGridKey(panorama.latitude, panorama.longitude);

      if (!this.spatialIndex.has(gridKey)) {
        this.spatialIndex.set(gridKey, []);
      }
      this.spatialIndex.get(gridKey)!.push(panorama);
    }
  }

  /**
   * Genera clave de grid para índice espacial
   */
  private getGridKey(lat: number, lon: number): string {
    const gridLat = Math.floor(lat / this.GRID_SIZE);
    const gridLon = Math.floor(lon / this.GRID_SIZE);
    return `${gridLat},${gridLon}`;
  }

  /**
   * Obtiene panoramas cercanos usando el índice espacial
   */
  private getNearbyFromSpatialIndex(lat: number, lon: number, radius: number = this.GRID_SIZE): Panorama[] {
    const nearby: Panorama[] = [];
    const gridRadius = Math.ceil(radius / this.GRID_SIZE);
    const centerGridKey = this.getGridKey(lat, lon);
    const [centerLat, centerLon] = centerGridKey.split(',').map(Number);

    for (let deltaLat = -gridRadius; deltaLat <= gridRadius; deltaLat++) {
      for (let deltaLon = -gridRadius; deltaLon <= gridRadius; deltaLon++) {
        const gridKey = `${centerLat + deltaLat},${centerLon + deltaLon}`;
        const panoramas = this.spatialIndex.get(gridKey);
        if (panoramas) {
          nearby.push(...panoramas);
        }
      }
    }

    return nearby.filter(p => {
      const distance = this.calculateDistanceOptimized(lat, lon, p.latitude, p.longitude);
      return distance <= radius;
    });
  }

  /**
   * Algoritmo mejorado de ordenamiento secuencial usando MST (Minimum Spanning Tree)
   */
  private optimizeSequentialOrder(): void {
    if (this.allPanoramas.length === 0) return;

    // Crear clusters inteligentes
    const clusters = this.createOptimalClusters();

    // Ordenar cada cluster usando algoritmo de vecino más cercano mejorado
    const orderedClusters = clusters.map(cluster => this.optimizeClusterSequence(cluster));

    // Conectar clusters de manera óptima
    this.allPanoramas = this.connectClustersOptimally(orderedClusters);
  }

  /**
   * Crea clusters usando algoritmo DBSCAN adaptado
   */
  private createOptimalClusters(): Panorama[][] {
    const clusters: Panorama[][] = [];
    const visited = new Set<number>();
    const noise: Panorama[] = [];

    for (const panorama of this.allPanoramas) {
      if (visited.has(panorama.id)) continue;

      const neighbors = this.getNearbyFromSpatialIndex(
        panorama.latitude,
        panorama.longitude,
        this.MAX_CLUSTER_DISTANCE
      ).filter(p => p.id !== panorama.id);

      if (neighbors.length < 2) {
        noise.push(panorama);
        visited.add(panorama.id);
        continue;
      }

      // Crear cluster
      const cluster = [panorama];
      visited.add(panorama.id);

      const queue = [...neighbors.filter(n => !visited.has(n.id))];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current.id)) continue;

        visited.add(current.id);
        cluster.push(current);

        const currentNeighbors = this.getNearbyFromSpatialIndex(
          current.latitude,
          current.longitude,
          this.MAX_CLUSTER_DISTANCE
        ).filter(p => !visited.has(p.id));

        queue.push(...currentNeighbors);
      }

      clusters.push(cluster);
    }

    // Agregar panoramas aislados como clusters individuales
    if (noise.length > 0) {
      clusters.push(noise);
    }

    return clusters;
  }

  /**
   * Optimiza la secuencia dentro de un cluster usando algoritmo de vecino más cercano con mejoras
   */
  private optimizeClusterSequence(cluster: Panorama[]): Panorama[] {
    if (cluster.length <= 2) return cluster;

    // Encontrar punto de inicio óptimo (más al norte y oeste)
    const startPoint = cluster.reduce((best, current) => {
      const score = current.latitude * 1000 + current.longitude * 1000;
      const bestScore = best.latitude * 1000 + best.longitude * 1000;
      return score > bestScore ? current : best;
    });

    const sequence = [startPoint];
    const remaining = cluster.filter(p => p.id !== startPoint.id);

    while (remaining.length > 0) {
      const current = sequence[sequence.length - 1];

      // Buscar el mejor siguiente considerando dirección y distancia
      let bestCandidate = remaining[0];
      let bestScore = this.calculatePathScore(current, bestCandidate, sequence);

      for (let i = 1; i < remaining.length; i++) {
        const candidate = remaining[i];
        const score = this.calculatePathScore(current, candidate, sequence);

        if (score > bestScore) {
          bestScore = score;
          bestCandidate = candidate;
        }
      }

      sequence.push(bestCandidate);
      remaining.splice(remaining.indexOf(bestCandidate), 1);
    }

    return sequence;
  }

  /**
   * Calcula un score para determinar el mejor siguiente panorama en la secuencia
   */
  private calculatePathScore(current: Panorama, candidate: Panorama, sequence: Panorama[]): number {
    const distance = this.calculateDistanceOptimized(
      current.latitude, current.longitude,
      candidate.latitude, candidate.longitude
    );

    // Penalizar distancias muy grandes
    let distanceScore = Math.max(0, 1 - distance / this.MAX_SEARCH_RADIUS);

    // Bonus por continuidad direccional
    let directionScore = 0;
    if (sequence.length >= 2) {
      const prevBearing = this.calculateBearing(
        sequence[sequence.length - 2].latitude,
        sequence[sequence.length - 2].longitude,
        current.latitude,
        current.longitude
      );
      const currentBearing = this.calculateBearing(
        current.latitude, current.longitude,
        candidate.latitude, candidate.longitude
      );

      const angleDiff = this.getAngleDifference(prevBearing, currentBearing);
      directionScore = Math.max(0, 1 - angleDiff / 180);
    }

    return distanceScore * 0.7 + directionScore * 0.3;
  }

  /**
   * Conecta clusters de manera óptima
   */
  private connectClustersOptimally(clusters: Panorama[][]): Panorama[] {
    if (clusters.length <= 1) {
      return clusters.length === 1 ? clusters[0] : [];
    }

    const result = [...clusters[0]];
    const remainingClusters = clusters.slice(1);

    while (remainingClusters.length > 0) {
      const lastPanorama = result[result.length - 1];

      let closestClusterIndex = 0;
      let closestDistance = Infinity;
      let closestPanorama: Panorama | null = null;

      // Encontrar el cluster más cercano
      for (let i = 0; i < remainingClusters.length; i++) {
        const cluster = remainingClusters[i];

        for (const panorama of cluster) {
          const distance = this.calculateDistanceOptimized(
            lastPanorama.latitude, lastPanorama.longitude,
            panorama.latitude, panorama.longitude
          );

          if (distance < closestDistance) {
            closestDistance = distance;
            closestClusterIndex = i;
            closestPanorama = panorama;
          }
        }
      }

      // Agregar el cluster más cercano, empezando por el panorama más cercano
      const closestCluster = remainingClusters[closestClusterIndex];
      const closestPanoramaIndex = closestCluster.indexOf(closestPanorama!);

      // Reorganizar el cluster para que empiece por el panorama más cercano
      const reorderedCluster = [
        ...closestCluster.slice(closestPanoramaIndex),
        ...closestCluster.slice(0, closestPanoramaIndex)
      ];

      result.push(...reorderedCluster);
      remainingClusters.splice(closestClusterIndex, 1);
    }

    return result;
  }

  /**
   * Versión optimizada del cálculo de distancia con cache
   */
  private calculateDistanceOptimized(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const key = `${lat1.toFixed(6)},${lon1.toFixed(6)},${lat2.toFixed(6)},${lon2.toFixed(6)}`;

    if (this.distanceCache[key]) {
      return this.distanceCache[key];
    }

    const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
    this.distanceCache[key] = distance;

    return distance;
  }

  /**
   * Actualiza el contexto de navegación con algoritmo mejorado
   */
  updateNavigationContext(currentPanoramaId: number, viewingAngle: number = 0): void {
    const currentPanorama = this.allPanoramas.find(p => p.id === currentPanoramaId);
    if (!currentPanorama) {
      this.navigationContext$.next(null);
      return;
    }

    // Usar índice espacial para obtener candidatos cercanos
    const nearbyPanoramas = this.getNearbyFromSpatialIndex(
      currentPanorama.latitude,
      currentPanorama.longitude,
      this.MAX_SEARCH_RADIUS
    ).filter(p => p.id !== currentPanorama.id);

    const nearestWithDirections = this.calculatePanoramaDirections(currentPanorama, nearbyPanoramas, viewingAngle);

    const context: NavigationContext = {
      current: currentPanorama,
      nearest: nearestWithDirections.slice(0, 8),
      ahead: this.findBestDirectionalPanorama(nearestWithDirections, viewingAngle, 60),
      behind: this.findBestDirectionalPanorama(nearestWithDirections, viewingAngle + 180, 60),
      left: this.findBestDirectionalPanorama(nearestWithDirections, viewingAngle - 90, 60),
      right: this.findBestDirectionalPanorama(nearestWithDirections, viewingAngle + 90, 60),
      viewingAngle
    };

    this.navigationContext$.next(context);
  }

  /**
   * Calcula direcciones de panoramas con puntuación de confianza
   */
  private calculatePanoramaDirections(
    currentPanorama: Panorama,
    candidates: Panorama[],
    viewingAngle: number
  ): PanoramaDirection[] {
    return candidates
      .map(panorama => {
        const distance = this.calculateDistanceOptimized(
          currentPanorama.latitude, currentPanorama.longitude,
          panorama.latitude, panorama.longitude
        );

        const bearing = this.calculateBearing(
          currentPanorama.latitude, currentPanorama.longitude,
          panorama.latitude, panorama.longitude
        );

        const angleDiff = this.getAngleDifference(bearing, viewingAngle);
        const isInViewAngle = angleDiff <= 90;

        // Calcular confianza basada en distancia y alineación
        const distanceScore = Math.max(0, 1 - distance / this.MAX_SEARCH_RADIUS);
        const alignmentScore = Math.max(0, 1 - angleDiff / 180);
        const confidence = distanceScore * 0.6 + alignmentScore * 0.4;

        return {
          panorama,
          distance,
          bearing,
          direction: this.getCardinalDirection(bearing),
          isInViewAngle,
          confidence
        } as PanoramaDirection;
      })
      .sort((a, b) => {
        // Ordenar por confianza primero, luego por distancia
        if (Math.abs(a.confidence - b.confidence) > 0.1) {
          return b.confidence - a.confidence;
        }
        return a.distance - b.distance;
      });
  }

  /**
   * Encuentra el mejor panorama en una dirección específica
   */
  private findBestDirectionalPanorama(
    nearestPanoramas: PanoramaDirection[],
    targetAngle: number,
    tolerance: number = 60
  ): PanoramaDirection | null {
    const normalizedAngle = ((targetAngle % 360) + 360) % 360;

    const candidates = nearestPanoramas.filter(pd => {
      const angleDiff = this.getAngleDifference(pd.bearing, normalizedAngle);
      return angleDiff <= tolerance;
    });

    if (candidates.length === 0) return null;

    // Retornar el candidato con mejor puntuación combinada
    return candidates.reduce((best, current) => {
      const bestScore = this.calculateDirectionalScore(best, normalizedAngle);
      const currentScore = this.calculateDirectionalScore(current, normalizedAngle);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Calcula puntuación direccional considerando múltiples factores
   */
  private calculateDirectionalScore(panoramaDirection: PanoramaDirection, targetAngle: number): number {
    const angleDiff = this.getAngleDifference(panoramaDirection.bearing, targetAngle);
    const angleScore = Math.max(0, 1 - angleDiff / 180);
    const distanceScore = Math.max(0, 1 - panoramaDirection.distance / this.MAX_SEARCH_RADIUS);

    return angleScore * 0.7 + distanceScore * 0.2 + panoramaDirection.confidence * 0.1;
  }

  private clearCaches(): void {
    this.distanceCache = {};
    this.spatialIndex.clear();
  }

  private getAngleDifference(angle1: number, angle2: number): number {
    let diff = Math.abs(angle1 - angle2);
    if (diff > 180) diff = 360 - diff;
    return diff;
  }

  private getCardinalDirection(bearing: number): 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest' {
    const normalizedBearing = ((bearing % 360) + 360) % 360;
    const directions = [
      { min: 337.5, max: 360, dir: 'north' as const },
      { min: 0, max: 22.5, dir: 'north' as const },
      { min: 22.5, max: 67.5, dir: 'northeast' as const },
      { min: 67.5, max: 112.5, dir: 'east' as const },
      { min: 112.5, max: 157.5, dir: 'southeast' as const },
      { min: 157.5, max: 202.5, dir: 'south' as const },
      { min: 202.5, max: 247.5, dir: 'southwest' as const },
      { min: 247.5, max: 292.5, dir: 'west' as const },
      { min: 292.5, max: 337.5, dir: 'northwest' as const }
    ];

    return directions.find(d => normalizedBearing >= d.min && normalizedBearing < d.max)?.dir || 'north';
  }

  /**
   * Métodos públicos mejorados
   */
  getNextPanorama(currentId: number): Panorama | undefined {
    const context = this.navigationContext$.value;

    if (
      context?.ahead &&
      typeof context.ahead.confidence === 'number' &&
      context.ahead.confidence > 0.5
    ) {
      return context.ahead.panorama;
    }

    return this.getSequentialNext(currentId);
  }

  getPrevPanorama(currentId: number): Panorama | undefined {
    const context = this.navigationContext$.value;

    if (
      context?.behind &&
      typeof context.behind.confidence === 'number' &&
      context.behind.confidence > 0.5
    ) {
      return context.behind.panorama;
    }
    return this.getSequentialPrev(currentId);
  }

  private getSequentialNext(currentId: number): Panorama | undefined {
    const index = this.allPanoramas.findIndex(pano => pano.id === currentId);
    if (index === -1) return undefined;
    const nextIndex = (index + 1) % this.allPanoramas.length;
    return this.allPanoramas[nextIndex];
  }

  private getSequentialPrev(currentId: number): Panorama | undefined {
    const index = this.allPanoramas.findIndex(pano => pano.id === currentId);
    if (index === -1) return undefined;
    const prevIndex = (index - 1 + this.allPanoramas.length) % this.allPanoramas.length;
    return this.allPanoramas[prevIndex];
  }

  getPanoramaInDirection(
    fromLat: number,
    fromLon: number,
    direction: 'north' | 'south' | 'east' | 'west' | number,
    maxDistance: number = this.MAX_SEARCH_RADIUS
  ): Panorama | null {
    let targetBearing: number;

    if (typeof direction === 'number') {
      targetBearing = direction;
    } else {
      const directionMap = { 'north': 0, 'east': 90, 'south': 180, 'west': 270 };
      targetBearing = directionMap[direction];
    }

    const candidates = this.getNearbyFromSpatialIndex(fromLat, fromLon, maxDistance)
      .map(panorama => {
        const distance = this.calculateDistanceOptimized(fromLat, fromLon, panorama.latitude, panorama.longitude);
        const bearing = this.calculateBearing(fromLat, fromLon, panorama.latitude, panorama.longitude);
        const angleDiff = this.getAngleDifference(bearing, targetBearing);
        const score = this.calculateDirectionalScore({
          panorama, distance, bearing, direction: this.getCardinalDirection(bearing),
          isInViewAngle: false, confidence: 1 - distance / maxDistance
        }, targetBearing);

        return { panorama, distance, bearing, angleDiff, score };
      })
      .filter(item => item.distance <= maxDistance && item.angleDiff <= 45)
      .sort((a, b) => b.score - a.score);

    return candidates.length > 0 ? candidates[0].panorama : null;
  }

  findNextPanoramaFromClick(
    currentPanoramaId: number,
    clickPosition: { x: number, y: number, z: number },
    cameraOrientation: number
  ): Panorama | null {
    const currentPanorama = this.allPanoramas.find(p => p.id === currentPanoramaId);
    if (!currentPanorama) return null;

    const clickAngle = this.calculateClickAngle(clickPosition, cameraOrientation);
    this.updateNavigationContext(currentPanoramaId, clickAngle);

    const context = this.navigationContext$.value;
    if (
      context?.ahead &&
      typeof context.ahead.confidence === 'number' &&
      context.ahead.confidence > 0.3
    ) {
      return context.ahead.panorama;
    }

    return this.getPanoramaInDirection(
      currentPanorama.latitude,
      currentPanorama.longitude,
      clickAngle,
      this.MAX_SEARCH_RADIUS * 0.5
    );
  }

  private calculateClickAngle(position: { x: number, y: number, z: number }, cameraOrientation: number): number {
    // Normalizar el vector de posición
    const magnitude = Math.sqrt(position.x * position.x + position.z * position.z);
    if (magnitude === 0) return cameraOrientation;

    const normalizedX = position.x / magnitude;
    const normalizedZ = position.z / magnitude;

    const angle = Math.atan2(normalizedZ, normalizedX) * 180 / Math.PI;
    return (angle + cameraOrientation + 360) % 360;
  }

  // Métodos utilitarios
  toRad(deg: number): number {
    return deg * Math.PI / 180;
  }

  toDeg(rad: number): number {
    return rad * 180 / Math.PI;
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = this.toRad(lon2 - lon1);
    const lat1Rad = this.toRad(lat1);
    const lat2Rad = this.toRad(lat2);
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    let brng = Math.atan2(y, x);
    brng = this.toDeg(brng);
    return (brng + 360) % 360;
  }

  isPanoramaAhead(
    currentLat: number,
    currentLon: number,
    currentOrientationDeg: number,
    targetLat: number,
    targetLon: number,
    toleranceDeg = 90
  ): boolean {
    const bearingToTarget = this.calculateBearing(currentLat, currentLon, targetLat, targetLon);
    const angleDiff = this.getAngleDifference(bearingToTarget, currentOrientationDeg);
    return angleDiff <= toleranceDeg / 2;
  }
}
