export namespace database {
	
	export class GlobalStats {
	    total_files: number;
	    videos: number;
	    audio: number;
	    total_size: string;
	
	    static createFrom(source: any = {}) {
	        return new GlobalStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total_files = source["total_files"];
	        this.videos = source["videos"];
	        this.audio = source["audio"];
	        this.total_size = source["total_size"];
	    }
	}
	export class MediaItem {
	    id: string;
	    title: string;
	    media_type: string;
	    file_path: string;
	    cover_path: string;
	    metadata: string;
	    file_size: number;
	    duration: number;
	    artist: string;
	    play_count: number;
	    // Go type: time
	    last_played?: any;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new MediaItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.media_type = source["media_type"];
	        this.file_path = source["file_path"];
	        this.cover_path = source["cover_path"];
	        this.metadata = source["metadata"];
	        this.file_size = source["file_size"];
	        this.duration = source["duration"];
	        this.artist = source["artist"];
	        this.play_count = source["play_count"];
	        this.last_played = this.convertValues(source["last_played"], null);
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class WatchProgress {
	    id: string;
	    media_path: string;
	    position: number;
	    duration: number;
	    completed: boolean;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new WatchProgress(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.media_path = source["media_path"];
	        this.position = source["position"];
	        this.duration = source["duration"];
	        this.completed = source["completed"];
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace music {
	
	export class TrackInfo {
	    id: string;
	    title: string;
	    artist: string;
	    album: string;
	    durationSecs: number;
	    filePath: string;
	    coverPath: string;
	    trackNumber: number;
	    genre: string;
	    year: number;
	
	    static createFrom(source: any = {}) {
	        return new TrackInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.artist = source["artist"];
	        this.album = source["album"];
	        this.durationSecs = source["durationSecs"];
	        this.filePath = source["filePath"];
	        this.coverPath = source["coverPath"];
	        this.trackNumber = source["trackNumber"];
	        this.genre = source["genre"];
	        this.year = source["year"];
	    }
	}

}

export namespace subtitles {
	
	export class SearchResult {
	    id: string;
	    fileName: string;
	    language: string;
	    downloadCount: number;
	    hearingImpaired: boolean;
	    fileId: string;
	    releaseName: string;
	    episodeNumber: number;
	    seasonNumber: number;
	
	    static createFrom(source: any = {}) {
	        return new SearchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.fileName = source["fileName"];
	        this.language = source["language"];
	        this.downloadCount = source["downloadCount"];
	        this.hearingImpaired = source["hearingImpaired"];
	        this.fileId = source["fileId"];
	        this.releaseName = source["releaseName"];
	        this.episodeNumber = source["episodeNumber"];
	        this.seasonNumber = source["seasonNumber"];
	    }
	}

}

export namespace torrent {
	
	export class FileInfo {
	    Path: string;
	    Length: number;
	    Index: number;
	    IsVideo: boolean;
	
	    static createFrom(source: any = {}) {
	        return new FileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Path = source["Path"];
	        this.Length = source["Length"];
	        this.Index = source["Index"];
	        this.IsVideo = source["IsVideo"];
	    }
	}
	export class TorrentInfo {
	    infoHash: string;
	    name: string;
	    totalSize: number;
	    files: FileInfo[];
	    streamUrl: string;
	    state: string;
	
	    static createFrom(source: any = {}) {
	        return new TorrentInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.infoHash = source["infoHash"];
	        this.name = source["name"];
	        this.totalSize = source["totalSize"];
	        this.files = this.convertValues(source["files"], FileInfo);
	        this.streamUrl = source["streamUrl"];
	        this.state = source["state"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TorrentStatus {
	    infoHash: string;
	    bytesWritten: number;
	    bytesRead: number;
	    peers: number;
	    speed: number;
	    progress: number;
	    state: string;
	
	    static createFrom(source: any = {}) {
	        return new TorrentStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.infoHash = source["infoHash"];
	        this.bytesWritten = source["bytesWritten"];
	        this.bytesRead = source["bytesRead"];
	        this.peers = source["peers"];
	        this.speed = source["speed"];
	        this.progress = source["progress"];
	        this.state = source["state"];
	    }
	}

}

