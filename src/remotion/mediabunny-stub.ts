export class Input {}
export class Output {}
export class AudioSample {}
export class VideoSample {}
export class AudioSampleSource {}
export class AudioSampleSink {}
export class VideoSampleSource {}
export class VideoSampleSink {}
export class AudioBufferSink {}
export class BufferTarget {}
export class StreamTarget {}
export class BlobSource {}
export class UrlSource {}
export class InputDisposedError extends Error {}
export class AdtsOutputFormat {}
export class FlacOutputFormat {}
export class MkvOutputFormat {}
export class MovOutputFormat {}
export class Mp3OutputFormat {}
export class Mp4OutputFormat {}
export class OggOutputFormat {}
export class WavOutputFormat {}
export class WebMOutputFormat {}

export const ALL_FORMATS: any[] = [];
export const MATROSKA = 'matroska';
export const WEBM = 'webm';
export const QUALITY_VERY_LOW = 'very-low';
export const QUALITY_LOW = 'low';
export const QUALITY_MEDIUM = 'medium';
export const QUALITY_HIGH = 'high';
export const QUALITY_VERY_HIGH = 'very-high';

export const canEncodeVideo = () => false;
export const canEncodeAudio = () => false;
export const getEncodableAudioCodecs = () => [];
export const getEncodableVideoCodecs = () => [];
