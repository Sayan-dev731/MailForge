import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Stage, Layer, Text, Image as KonvaImage, Transformer } from 'react-konva';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Upload, Type, Eye, Trash2, Plus, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useImage from 'use-image';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Background Image Component
function BackgroundImage({ src, width, height }) {
    const [image] = useImage(src);
    return image ? <KonvaImage image={image} width={width} height={height} /> : null;
}

// Editable Text Component
function EditableText({ element, isSelected, onSelect, onChange }) {
    const shapeRef = useRef();
    const trRef = useRef();

    useEffect(() => {
        if (isSelected && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [isSelected]);

    return (
        <>
            <Text
                ref={shapeRef}
                {...element}
                draggable
                onClick={onSelect}
                onTap={onSelect}
                onDragEnd={(e) => {
                    onChange({
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={() => {
                    const node = shapeRef.current;
                    onChange({
                        x: node.x(),
                        y: node.y(),
                        width: Math.max(50, node.width() * node.scaleX()),
                        scaleX: 1,
                        scaleY: 1,
                    });
                }}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    enabledAnchors={['middle-left', 'middle-right']}
                    boundBoxFunc={(oldBox, newBox) => {
                        newBox.width = Math.max(50, newBox.width);
                        return newBox;
                    }}
                />
            )}
        </>
    );
}

export default function CertificateEditorSimple({ data, onNext, onBack, onSkip, canGoBack, canSkip }) {
    // Core state
    const [enabled, setEnabled] = useState(false);
    const [backgroundImage, setBackgroundImage] = useState(null);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [elements, setElements] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [generatingPreview, setGeneratingPreview] = useState(false);

    // Refs
    const stageRef = useRef();
    const pdfInputRef = useRef();
    const imageInputRef = useRef();

    // Get variables from data
    const variables = data.availableVariables || [
        { key: '{{name}}', label: 'Name' },
        { key: '{{email}}', label: 'Email' },
        { key: '{{date}}', label: 'Date' },
    ];

    // Get sample recipient for preview
    const sampleRecipient = data.recipients?.[0] || { name: 'John Doe', email: 'john@example.com' };

    // Replace variables in text
    const replaceVariables = (text) => {
        let result = text;
        Object.entries(sampleRecipient).forEach(([key, value]) => {
            result = result.replace(new RegExp(`{{${key}}}`, 'gi'), value);
        });
        result = result.replace(/{{date}}/gi, new Date().toLocaleDateString());
        return result;
    };

    // Handle PDF Upload
    const handlePdfUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error('Please upload a PDF file');
            return;
        }

        try {
            toast.loading('Loading PDF (high quality)...', { id: 'pdf-load' });

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);

            // Get original dimensions at scale=1
            const originalViewport = page.getViewport({ scale: 1 });
            const pdfWidth = originalViewport.width;
            const pdfHeight = originalViewport.height;

            // Render at 2x scale for HIGH QUALITY
            const QUALITY_SCALE = 2;
            const highResViewport = page.getViewport({ scale: QUALITY_SCALE });

            const canvas = document.createElement('canvas');
            canvas.width = highResViewport.width;  // 2x width
            canvas.height = highResViewport.height; // 2x height

            await page.render({
                canvasContext: canvas.getContext('2d'),
                viewport: highResViewport,
            }).promise;

            // Export as high quality PNG (quality ignored for PNG, but max detail preserved)
            setBackgroundImage(canvas.toDataURL('image/png'));

            // Store ORIGINAL dimensions for canvas positioning (text placement)
            // But the image is 2x resolution for high quality
            setCanvasSize({ width: Math.round(pdfWidth), height: Math.round(pdfHeight) });
            setElements([]);

            console.log(`PDF loaded: ${pdfWidth}×${pdfHeight}px (rendered at ${QUALITY_SCALE}x = ${canvas.width}×${canvas.height})`);
            toast.success(`PDF loaded: ${Math.round(pdfWidth)}×${Math.round(pdfHeight)}px (HD)`, { id: 'pdf-load' });
        } catch (error) {
            console.error('PDF error:', error);
            toast.error('Failed to load PDF', { id: 'pdf-load' });
        }
        e.target.value = '';
    };

    // Handle Image Upload
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const img = new window.Image();
            img.onload = () => {
                setBackgroundImage(reader.result);
                setCanvasSize({ width: img.width, height: img.height });
                setElements([]);
                toast.success(`Image loaded: ${img.width}×${img.height}px`);
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Add Text Element
    const handleAddText = (text = 'New Text') => {
        const newElement = {
            id: `text_${Date.now()}`,
            type: 'text',
            text,
            x: canvasSize.width / 2 - 100,
            y: canvasSize.height / 2,
            fontSize: 24,
            fontFamily: 'Arial',
            fill: '#000000',
            width: 200,
            align: 'center',
        };
        setElements([...elements, newElement]);
        setSelectedId(newElement.id);
    };

    // Update Element
    const handleUpdateElement = (id, updates) => {
        setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
    };

    // Delete Element
    const handleDeleteElement = () => {
        if (selectedId) {
            setElements(elements.filter(el => el.id !== selectedId));
            setSelectedId(null);
        }
    };

    // Generate Preview - Frontend-based using Konva canvas
    const handleGeneratePreview = async () => {
        if (!backgroundImage) {
            toast.error('Please upload a certificate template first');
            return;
        }

        setGeneratingPreview(true);
        try {
            // Create a temporary offscreen Konva stage for preview generation
            const Konva = await import('konva');
            const tempContainer = document.createElement('div');
            document.body.appendChild(tempContainer);

            const stage = new Konva.default.Stage({
                container: tempContainer,
                width: canvasSize.width,
                height: canvasSize.height,
            });

            const layer = new Konva.default.Layer();
            stage.add(layer);

            // Load and draw background image
            await new Promise((resolve, reject) => {
                const img = new window.Image();
                img.onload = () => {
                    const bgImage = new Konva.default.Image({
                        image: img,
                        width: canvasSize.width,
                        height: canvasSize.height,
                    });
                    layer.add(bgImage);
                    resolve();
                };
                img.onerror = reject;
                img.src = backgroundImage;
            });

            // Add text elements with variables replaced
            for (const el of elements) {
                if (el.type === 'text') {
                    const text = new Konva.default.Text({
                        x: el.x,
                        y: el.y,
                        text: replaceVariables(el.text),
                        fontSize: el.fontSize,
                        fontFamily: el.fontFamily,
                        fill: el.fill,
                        width: el.width,
                        align: el.align,
                    });
                    layer.add(text);
                }
            }

            layer.draw();

            // Export as HIGH QUALITY image (2x pixel ratio)
            const dataUrl = stage.toDataURL({ pixelRatio: 2 });
            setPreviewData(dataUrl);

            // Cleanup
            stage.destroy();
            document.body.removeChild(tempContainer);

            toast.success('Preview generated!');
        } catch (error) {
            console.error('Preview error:', error);
            toast.error('Failed to generate preview');
        } finally {
            setGeneratingPreview(false);
        }
    };

    // Handle Next
    const handleNext = () => {
        if (enabled) {
            onNext({
                certificateTemplate: {
                    enabled: true,
                    elements,
                    backgroundImage,
                    width: canvasSize.width,
                    height: canvasSize.height,
                    canvasSize,
                },
            });
        } else {
            onNext({ certificateTemplate: null });
        }
    };

    const selectedElement = elements.find(el => el.id === selectedId);

    return (
        <div className="card">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">🎨 Certificate Designer</h2>
                <p className="text-gray-400">Upload a certificate template and add text overlays</p>
            </div>

            {/* Enable Toggle */}
            <div className="mb-6 p-4 bg-github-hover border border-github-border rounded-lg">
                <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setEnabled(e.target.checked)}
                        className="w-5 h-5 rounded"
                    />
                    <div>
                        <p className="text-white font-medium">Enable Certificate Generation</p>
                        <p className="text-sm text-gray-400">Create certificates for each recipient</p>
                    </div>
                </label>
            </div>

            {enabled && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    {/* Hidden Inputs */}
                    <input ref={pdfInputRef} type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />
                    <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-github-hover border border-github-border rounded-lg">
                        <button
                            onClick={() => pdfInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-2 bg-github-blue text-white rounded hover:bg-blue-600"
                        >
                            <FileText className="w-4 h-4" />
                            Upload PDF
                        </button>
                        <button
                            onClick={() => imageInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-2 bg-github-dark text-gray-300 rounded hover:bg-github-hover"
                        >
                            <Upload className="w-4 h-4" />
                            Upload Image
                        </button>
                        <div className="w-px h-6 bg-github-border mx-2" />
                        <button
                            onClick={() => handleAddText()}
                            className="flex items-center gap-2 px-3 py-2 bg-github-dark text-gray-300 rounded hover:bg-github-hover"
                        >
                            <Type className="w-4 h-4" />
                            Add Text
                        </button>
                        <button
                            onClick={handleDeleteElement}
                            disabled={!selectedId}
                            className="flex items-center gap-2 px-3 py-2 bg-github-dark text-gray-300 rounded hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="ml-auto" />
                        <button
                            onClick={handleGeneratePreview}
                            disabled={!backgroundImage || generatingPreview}
                            className="flex items-center gap-2 px-3 py-2 bg-github-green text-white rounded hover:bg-green-600 disabled:opacity-50"
                        >
                            <Eye className="w-4 h-4" />
                            {generatingPreview ? 'Generating...' : 'Preview'}
                        </button>
                    </div>

                    {/* Dynamic Variables */}
                    <div className="p-3 bg-github-hover border border-github-border rounded-lg">
                        <p className="text-sm text-gray-400 mb-2">Click to add dynamic variable:</p>
                        <div className="flex flex-wrap gap-2">
                            {variables.map((v) => (
                                <button
                                    key={v.key}
                                    onClick={() => handleAddText(v.key)}
                                    className="px-3 py-1 bg-github-blue/20 text-github-blue rounded text-sm hover:bg-github-blue/30"
                                >
                                    {v.key}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content: Editor & Preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Canvas Editor */}
                        <div>
                            <h3 className="text-white font-medium mb-2 flex items-center">
                                <Type className="w-4 h-4 mr-2" />
                                Editor ({canvasSize.width}×{canvasSize.height}px)
                            </h3>
                            <div
                                className="bg-gray-300 rounded-lg overflow-auto border-2 border-github-border"
                                style={{ maxHeight: '500px' }}
                            >
                                {backgroundImage ? (
                                    <Stage
                                        ref={stageRef}
                                        width={canvasSize.width}
                                        height={canvasSize.height}
                                        onMouseDown={(e) => {
                                            if (e.target === e.target.getStage()) {
                                                setSelectedId(null);
                                            }
                                        }}
                                        style={{ background: 'white' }}
                                    >
                                        <Layer>
                                            <BackgroundImage
                                                src={backgroundImage}
                                                width={canvasSize.width}
                                                height={canvasSize.height}
                                            />
                                            {elements.map((el) => (
                                                <EditableText
                                                    key={el.id}
                                                    element={el}
                                                    isSelected={el.id === selectedId}
                                                    onSelect={() => setSelectedId(el.id)}
                                                    onChange={(updates) => handleUpdateElement(el.id, updates)}
                                                />
                                            ))}
                                        </Layer>
                                    </Stage>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                        <FileText className="w-12 h-12 mb-4 opacity-50" />
                                        <p>Upload a PDF or image to start</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Live Preview */}
                        <div>
                            <h3 className="text-white font-medium mb-2 flex items-center">
                                <Eye className="w-4 h-4 mr-2" />
                                Live Preview (with sample data)
                            </h3>
                            <div
                                className="bg-gray-300 rounded-lg overflow-auto border-2 border-github-border"
                                style={{ maxHeight: '500px' }}
                            >
                                {backgroundImage ? (
                                    <Stage
                                        width={canvasSize.width}
                                        height={canvasSize.height}
                                        style={{ background: 'white' }}
                                    >
                                        <Layer>
                                            <BackgroundImage
                                                src={backgroundImage}
                                                width={canvasSize.width}
                                                height={canvasSize.height}
                                            />
                                            {elements.map((el) => (
                                                <Text
                                                    key={el.id}
                                                    {...el}
                                                    text={replaceVariables(el.text)}
                                                />
                                            ))}
                                        </Layer>
                                    </Stage>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                        <Eye className="w-12 h-12 mb-4 opacity-50" />
                                        <p>Preview will appear here</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Properties Panel */}
                    {selectedElement && (
                        <div className="p-4 bg-github-hover border border-github-border rounded-lg">
                            <h3 className="text-white font-medium mb-3">Text Properties</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Text Content</label>
                                    <input
                                        type="text"
                                        value={selectedElement.text}
                                        onChange={(e) => handleUpdateElement(selectedId, { text: e.target.value })}
                                        className="input-field text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Font Size</label>
                                    <input
                                        type="number"
                                        value={selectedElement.fontSize}
                                        onChange={(e) => handleUpdateElement(selectedId, { fontSize: parseInt(e.target.value) || 24 })}
                                        className="input-field text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Color</label>
                                    <input
                                        type="color"
                                        value={selectedElement.fill}
                                        onChange={(e) => handleUpdateElement(selectedId, { fill: e.target.value })}
                                        className="w-full h-9 rounded cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Font</label>
                                    <select
                                        value={selectedElement.fontFamily}
                                        onChange={(e) => handleUpdateElement(selectedId, { fontFamily: e.target.value })}
                                        className="input-field text-sm"
                                    >
                                        <option value="Arial">Arial</option>
                                        <option value="Helvetica">Helvetica</option>
                                        <option value="Times New Roman">Times New Roman</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Verdana">Verdana</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Certificate Preview - Dynamic sizing based on orientation */}
                    {previewData && (
                        <div className="p-4 bg-github-hover border border-github-border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-white font-medium flex items-center">
                                    <Eye className="w-4 h-4 mr-2" />
                                    Certificate Preview
                                    <span className="text-xs text-gray-400 ml-2">
                                        ({canvasSize.width}×{canvasSize.height} - {canvasSize.width > canvasSize.height ? 'Landscape' : 'Portrait'})
                                    </span>
                                </h3>
                                <button
                                    onClick={() => setPreviewData(null)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            {/* Dynamic container - no fixed height, respects image aspect ratio */}
                            <div
                                className={`overflow-auto bg-gray-800 rounded flex items-center justify-center p-2 ${canvasSize.width > canvasSize.height ? 'max-h-[60vh]' : 'max-h-[80vh]'
                                    }`}
                            >
                                <img
                                    src={previewData}
                                    alt="Certificate Preview"
                                    className="max-w-full h-auto shadow-lg rounded"
                                    style={{
                                        maxHeight: canvasSize.width > canvasSize.height ? '55vh' : '75vh',
                                    }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                This is exactly how your certificate will look when sent.
                            </p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
                {canGoBack && (
                    <button onClick={onBack} className="btn-secondary">
                        ← Back
                    </button>
                )}
                <div className="flex items-center space-x-3 ml-auto">
                    {canSkip && (
                        <button onClick={onSkip} className="btn-secondary">
                            Skip Certificates
                        </button>
                    )}
                    <button onClick={handleNext} className="btn-primary">
                        Next: Review & Send →
                    </button>
                </div>
            </div>
        </div>
    );
}
