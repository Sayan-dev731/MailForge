import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Stage, Layer, Text, Image as KonvaImage, Rect, Transformer, Line, Circle } from 'react-konva';
import Konva from 'konva';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
    Upload, Download, Plus, Trash2, Type, Image as ImageIcon, Move, Palette,
    AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyCenter,
    Bold, Italic, Underline, Copy, Layers, ZoomIn, ZoomOut, RotateCcw,
    Square, Circle as CircleIcon, Minus, ChevronUp, ChevronDown, Lock, Unlock, Eye, EyeOff,
    Sliders, Grid, FileJson, Import, Sun, Contrast, Droplets, LayoutTemplate, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import useImage from 'use-image';

// Set PDF.js worker using Vite's URL import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Component for text elements on canvas
const EditableText = ({ element, isSelected, onSelect, onChange, onDblClick }) => {
    const textRef = useRef();
    const trRef = useRef();

    useEffect(() => {
        if (isSelected && trRef.current && textRef.current) {
            trRef.current.nodes([textRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    if (element.hidden) return null;

    return (
        <>
            <Text
                ref={textRef}
                {...element}
                draggable={!element.locked}
                onClick={onSelect}
                onTap={onSelect}
                onDblClick={onDblClick}
                onDblTap={onDblClick}
                opacity={element.opacity || 1}
                onDragEnd={(e) => {
                    onChange({
                        ...element,
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={() => {
                    const node = textRef.current;
                    onChange({
                        ...element,
                        x: node.x(),
                        y: node.y(),
                        scaleX: node.scaleX(),
                        scaleY: node.scaleY(),
                        rotation: node.rotation(),
                    });
                }}
            />
            {isSelected && !element.locked && (
                <Transformer
                    ref={trRef}
                    rotateEnabled={true}
                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 20 || newBox.height < 20) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
        </>
    );
};

// Component for shape elements
const ShapeElement = ({ element, isSelected, onSelect, onChange }) => {
    const shapeRef = useRef();
    const trRef = useRef();

    useEffect(() => {
        if (isSelected && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    if (element.hidden) return null;

    const commonProps = {
        ref: shapeRef,
        x: element.x,
        y: element.y,
        fill: element.fill,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth || 0,
        draggable: !element.locked,
        onClick: onSelect,
        onTap: onSelect,
        opacity: element.opacity || 1,
        rotation: element.rotation || 0,
        onDragEnd: (e) => {
            onChange({ ...element, x: e.target.x(), y: e.target.y() });
        },
        onTransformEnd: () => {
            const node = shapeRef.current;
            onChange({
                ...element,
                x: node.x(),
                y: node.y(),
                scaleX: node.scaleX(),
                scaleY: node.scaleY(),
                rotation: node.rotation(),
            });
        },
    };

    return (
        <>
            {element.shapeType === 'rect' && (
                <Rect {...commonProps} width={element.width} height={element.height} cornerRadius={element.cornerRadius || 0} />
            )}
            {element.shapeType === 'circle' && (
                <Circle {...commonProps} radius={element.radius} />
            )}
            {element.shapeType === 'line' && (
                <Line {...commonProps} points={element.points} lineCap="round" lineJoin="round" />
            )}
            {isSelected && !element.locked && (
                <Transformer
                    ref={trRef}
                    rotateEnabled={true}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 10 || newBox.height < 10) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
        </>
    );
};

// Component for background image with filters
const BackgroundImage = ({ src, width, height, filters = {}, opacity = 1 }) => {
    const [image] = useImage(src, 'anonymous');
    const imageRef = useRef();

    useEffect(() => {
        if (imageRef.current) {
            imageRef.current.cache();
            imageRef.current.getLayer()?.batchDraw();
        }
    }, [filters, image]);

    if (!image) return null;

    // Apply CSS-like filters using Konva filters
    const konvaFilters = [];
    if (filters.brightness !== undefined && filters.brightness !== 0) {
        konvaFilters.push(Konva.Filters.Brighten);
    }
    if (filters.contrast !== undefined && filters.contrast !== 0) {
        konvaFilters.push(Konva.Filters.Contrast);
    }
    if (filters.blur !== undefined && filters.blur > 0) {
        konvaFilters.push(Konva.Filters.Blur);
    }
    if (filters.grayscale) {
        konvaFilters.push(Konva.Filters.Grayscale);
    }

    return (
        <KonvaImage
            ref={imageRef}
            image={image}
            width={width}
            height={height}
            opacity={opacity}
            filters={konvaFilters.length > 0 ? konvaFilters : undefined}
            brightness={filters.brightness || 0}
            contrast={filters.contrast || 0}
            blurRadius={filters.blur || 0}
        />
    );
};

// Component for draggable image elements (logos, signatures, etc.)
const ImageElement = ({ element, isSelected, onSelect, onChange }) => {
    const [image] = useImage(element.src, 'anonymous');
    const imageRef = useRef();
    const trRef = useRef();

    useEffect(() => {
        if (isSelected && trRef.current && imageRef.current) {
            trRef.current.nodes([imageRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    if (element.hidden || !image) return null;

    return (
        <>
            <KonvaImage
                ref={imageRef}
                image={image}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                rotation={element.rotation || 0}
                opacity={element.opacity || 1}
                draggable={!element.locked}
                onClick={onSelect}
                onTap={onSelect}
                shadowColor={element.shadowColor || 'black'}
                shadowBlur={element.shadowBlur || 0}
                shadowOffsetX={element.shadowOffsetX || 0}
                shadowOffsetY={element.shadowOffsetY || 0}
                shadowOpacity={element.shadowOpacity || 0.5}
                cornerRadius={element.cornerRadius || 0}
                onDragEnd={(e) => {
                    onChange({ ...element, x: e.target.x(), y: e.target.y() });
                }}
                onTransformEnd={() => {
                    const node = imageRef.current;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    onChange({
                        ...element,
                        x: node.x(),
                        y: node.y(),
                        width: Math.max(20, node.width() * scaleX),
                        height: Math.max(20, node.height() * scaleY),
                        rotation: node.rotation(),
                    });
                }}
            />
            {isSelected && !element.locked && (
                <Transformer
                    ref={trRef}
                    rotateEnabled={true}
                    keepRatio={element.keepRatio !== false}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 20 || newBox.height < 20) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
        </>
    );
};

// Available fonts (including Google Fonts)
const FONTS = [
    // System fonts
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
    // Google Fonts (popular)
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
    'Playfair Display', 'Oswald', 'Raleway', 'Ubuntu', 'Merriweather',
    'Dancing Script', 'Pacifico', 'Great Vibes', 'Cinzel', 'Bebas Neue'
];

// Preset colors
const PRESET_COLORS = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000', '#000080',
    '#808080', '#C0C0C0', '#800000', '#008080', '#FF6B6B', '#4ECDC4',
    '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
];

// Pre-made certificate templates
const TEMPLATES = [
    {
        id: 'elegant-blue',
        name: 'Elegant Blue',
        preview: '🎓',
        elements: [
            { id: 'border', type: 'shape', shapeType: 'rect', x: 20, y: 20, width: 760, height: 560, fill: 'transparent', stroke: '#1E40AF', strokeWidth: 4, cornerRadius: 15 },
            { id: 'inner-border', type: 'shape', shapeType: 'rect', x: 35, y: 35, width: 730, height: 530, fill: 'transparent', stroke: '#3B82F6', strokeWidth: 2, cornerRadius: 10 },
            { id: 'title', type: 'text', text: 'CERTIFICATE OF ACHIEVEMENT', x: 400, y: 80, fontSize: 38, fontFamily: 'Playfair Display', fill: '#1E40AF', fontStyle: 'bold', align: 'center', width: 600, offsetX: 300 },
            { id: 'subtitle', type: 'text', text: 'This is to certify that', x: 400, y: 180, fontSize: 18, fontFamily: 'Raleway', fill: '#64748B', align: 'center', width: 400, offsetX: 200 },
            { id: 'name', type: 'text', text: '{{name}}', x: 400, y: 240, fontSize: 52, fontFamily: 'Great Vibes', fill: '#1E40AF', fontStyle: 'bold', align: 'center', width: 600, offsetX: 300 },
            { id: 'achievement', type: 'text', text: 'has successfully completed', x: 400, y: 330, fontSize: 18, fontFamily: 'Raleway', fill: '#64748B', align: 'center', width: 500, offsetX: 250 },
            { id: 'date', type: 'text', text: '{{date}}', x: 400, y: 450, fontSize: 16, fontFamily: 'Roboto', fill: '#94A3B8', align: 'center', width: 300, offsetX: 150 },
        ],
        backgroundColor: '#FAFBFC',
    },
    {
        id: 'modern-gold',
        name: 'Modern Gold',
        preview: '🏆',
        elements: [
            { id: 'border', type: 'shape', shapeType: 'rect', x: 15, y: 15, width: 770, height: 570, fill: 'transparent', stroke: '#D4AF37', strokeWidth: 5, cornerRadius: 0 },
            { id: 'title', type: 'text', text: 'CERTIFICATE', x: 400, y: 70, fontSize: 48, fontFamily: 'Bebas Neue', fill: '#D4AF37', align: 'center', width: 600, offsetX: 300 },
            { id: 'of', type: 'text', text: 'OF EXCELLENCE', x: 400, y: 125, fontSize: 24, fontFamily: 'Montserrat', fill: '#333333', align: 'center', width: 400, offsetX: 200 },
            { id: 'name', type: 'text', text: '{{name}}', x: 400, y: 230, fontSize: 56, fontFamily: 'Cinzel', fill: '#1a1a1a', fontStyle: 'bold', align: 'center', width: 650, offsetX: 325 },
            { id: 'line1', type: 'shape', shapeType: 'line', x: 200, y: 300, points: [0, 0, 400, 0], stroke: '#D4AF37', strokeWidth: 2 },
            { id: 'achievement', type: 'text', text: 'For outstanding performance and dedication', x: 400, y: 340, fontSize: 16, fontFamily: 'Open Sans', fill: '#666666', align: 'center', width: 500, offsetX: 250 },
            { id: 'date', type: 'text', text: '{{date}}', x: 400, y: 480, fontSize: 14, fontFamily: 'Roboto', fill: '#888888', align: 'center', width: 300, offsetX: 150 },
        ],
        backgroundColor: '#FFFEF7',
    },
    {
        id: 'minimalist',
        name: 'Minimalist',
        preview: '✨',
        elements: [
            { id: 'title', type: 'text', text: 'Certificate', x: 400, y: 100, fontSize: 56, fontFamily: 'Playfair Display', fill: '#2D3748', fontStyle: 'italic', align: 'center', width: 600, offsetX: 300 },
            { id: 'line', type: 'shape', shapeType: 'line', x: 300, y: 170, points: [0, 0, 200, 0], stroke: '#CBD5E0', strokeWidth: 1 },
            { id: 'subtitle', type: 'text', text: 'Presented to', x: 400, y: 200, fontSize: 14, fontFamily: 'Lato', fill: '#718096', align: 'center', width: 300, offsetX: 150 },
            { id: 'name', type: 'text', text: '{{name}}', x: 400, y: 260, fontSize: 44, fontFamily: 'Lato', fill: '#2D3748', fontStyle: 'bold', align: 'center', width: 600, offsetX: 300 },
            { id: 'achievement', type: 'text', text: 'In recognition of exceptional achievement', x: 400, y: 350, fontSize: 16, fontFamily: 'Lato', fill: '#718096', align: 'center', width: 500, offsetX: 250 },
            { id: 'date', type: 'text', text: '{{date}}', x: 400, y: 480, fontSize: 12, fontFamily: 'Lato', fill: '#A0AEC0', align: 'center', width: 200, offsetX: 100 },
        ],
        backgroundColor: '#FFFFFF',
    },
    {
        id: 'corporate',
        name: 'Corporate Pro',
        preview: '💼',
        elements: [
            { id: 'header-bg', type: 'shape', shapeType: 'rect', x: 0, y: 0, width: 800, height: 100, fill: '#1E3A5F' },
            { id: 'footer-bg', type: 'shape', shapeType: 'rect', x: 0, y: 500, width: 800, height: 100, fill: '#1E3A5F' },
            { id: 'title', type: 'text', text: 'CERTIFICATE OF COMPLETION', x: 400, y: 35, fontSize: 28, fontFamily: 'Roboto', fill: '#FFFFFF', fontStyle: 'bold', align: 'center', width: 700, offsetX: 350 },
            { id: 'name', type: 'text', text: '{{name}}', x: 400, y: 220, fontSize: 48, fontFamily: 'Montserrat', fill: '#1E3A5F', fontStyle: 'bold', align: 'center', width: 600, offsetX: 300 },
            { id: 'subtitle', type: 'text', text: 'has successfully completed the requirements for', x: 400, y: 300, fontSize: 16, fontFamily: 'Open Sans', fill: '#4A5568', align: 'center', width: 500, offsetX: 250 },
            { id: 'program', type: 'text', text: '{{event}}', x: 400, y: 350, fontSize: 24, fontFamily: 'Montserrat', fill: '#2B6CB0', fontStyle: 'bold', align: 'center', width: 600, offsetX: 300 },
            { id: 'date', type: 'text', text: '{{date}}', x: 400, y: 530, fontSize: 14, fontFamily: 'Roboto', fill: '#FFFFFF', align: 'center', width: 300, offsetX: 150 },
        ],
        backgroundColor: '#F7FAFC',
    },
];

export default function CertificateEditor({ data, onNext, onBack, onSkip, canGoBack, canSkip }) {
    const [elements, setElements] = useState([
        {
            id: 'title',
            type: 'text',
            text: 'CERTIFICATE OF COMPLETION',
            x: 400,
            y: 80,
            fontSize: 42,
            fontFamily: 'Georgia',
            fill: '#1F2937',
            fontStyle: 'bold',
            align: 'center',
            width: 600,
            offsetX: 300,
        },
        {
            id: 'subtitle',
            type: 'text',
            text: 'This is to certify that',
            x: 400,
            y: 180,
            fontSize: 20,
            fontFamily: 'Georgia',
            fill: '#4B5563',
            align: 'center',
            width: 400,
            offsetX: 200,
        },
        {
            id: 'name',
            type: 'text',
            text: '{{name}}',
            x: 400,
            y: 250,
            fontSize: 48,
            fontFamily: 'Georgia',
            fill: '#3B82F6',
            fontStyle: 'bold',
            align: 'center',
            width: 600,
            offsetX: 300,
        },
        {
            id: 'achievement',
            type: 'text',
            text: 'has successfully completed the program',
            x: 400,
            y: 340,
            fontSize: 20,
            fontFamily: 'Georgia',
            fill: '#4B5563',
            align: 'center',
            width: 500,
            offsetX: 250,
        },
        {
            id: 'date',
            type: 'text',
            text: '{{date}}',
            x: 400,
            y: 420,
            fontSize: 16,
            fontFamily: 'Georgia',
            fill: '#6B7280',
            align: 'center',
            width: 300,
            offsetX: 150,
        },
        {
            id: 'border',
            type: 'shape',
            shapeType: 'rect',
            x: 20,
            y: 20,
            width: 760,
            height: 560,
            fill: 'transparent',
            stroke: '#3B82F6',
            strokeWidth: 3,
            cornerRadius: 10,
        },
    ]);

    const [selectedId, setSelectedId] = useState(null);
    const [backgroundImage, setBackgroundImage] = useState(null);
    const [backgroundSettings, setBackgroundSettings] = useState({
        opacity: 1,
        filters: { brightness: 0, contrast: 0, blur: 0, grayscale: false },
    });
    const [certificateEnabled, setCertificateEnabled] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [zoom, setZoom] = useState(1);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [editingTextId, setEditingTextId] = useState(null);
    const [copiedElement, setCopiedElement] = useState(null);
    const [showTemplateGallery, setShowTemplateGallery] = useState(false);
    const [showBackgroundSettings, setShowBackgroundSettings] = useState(false);
    const [certPreview, setCertPreview] = useState(null);
    const [generatingPreview, setGeneratingPreview] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [isPdfMode, setIsPdfMode] = useState(false); // Track if PDF is uploaded
    const [originalPdfSize, setOriginalPdfSize] = useState(null); // Original PDF dimensions
    const [showLivePreview, setShowLivePreview] = useState(true); // Show live preview panel

    const stageRef = useRef();
    const fileInputRef = useRef();
    const imageInputRef = useRef();
    const templateInputRef = useRef();
    const pdfInputRef = useRef();
    const containerRef = useRef();

    // Get available variables from field selector
    const variables = data.availableVariables || [
        { key: '{{name}}', label: 'Name' },
        { key: '{{email}}', label: 'Email' },
        { key: '{{date}}', label: 'Date' },
    ];

    // Save to history
    const saveToHistory = useCallback((newElements) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.stringify(newElements));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    // Undo
    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setElements(JSON.parse(history[historyIndex - 1]));
        }
    };

    // Redo
    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setElements(JSON.parse(history[historyIndex + 1]));
        }
    };

    const handleBackgroundUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image too large. Max 5MB allowed.');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                setBackgroundImage(reader.result);
                toast.success('Background image uploaded');
            };
            reader.readAsDataURL(file);
        }
    };

    // Add image element (logo, signature, etc.)
    const handleAddImage = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image too large. Max 5MB allowed.');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    // Scale down if too large
                    let width = img.width;
                    let height = img.height;
                    const maxSize = 200;
                    if (width > maxSize || height > maxSize) {
                        const ratio = Math.min(maxSize / width, maxSize / height);
                        width *= ratio;
                        height *= ratio;
                    }
                    const newElement = {
                        id: `image_${Date.now()}`,
                        type: 'image',
                        src: reader.result,
                        x: canvasSize.width / 2 - width / 2,
                        y: canvasSize.height / 2 - height / 2,
                        width,
                        height,
                        rotation: 0,
                        opacity: 1,
                        shadowBlur: 0,
                    };
                    const newElements = [...elements, newElement];
                    setElements(newElements);
                    saveToHistory(newElements);
                    setSelectedId(newElement.id);
                    toast.success('Image added');
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        }
        e.target.value = ''; // Reset input
    };

    // Apply a pre-made template
    const handleApplyTemplate = (template) => {
        setElements(template.elements.map(el => ({ ...el, id: `${el.id}_${Date.now()}` })));
        setBackgroundImage(null);
        setBackgroundSettings({
            opacity: 1,
            filters: { brightness: 0, contrast: 0, blur: 0, grayscale: false },
        });
        setShowTemplateGallery(false);
        saveToHistory(template.elements);
        toast.success(`Applied "${template.name}" template`);
    };

    // Export template as JSON
    const handleExportTemplate = () => {
        const templateData = {
            elements,
            backgroundImage,
            backgroundSettings,
            canvasSize,
            exportedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'certificate-template.json';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Template exported');
    };

    // Import template from JSON
    const handleImportTemplate = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (data.elements) {
                        setElements(data.elements);
                        saveToHistory(data.elements);
                    }
                    if (data.backgroundImage) setBackgroundImage(data.backgroundImage);
                    if (data.backgroundSettings) setBackgroundSettings(data.backgroundSettings);
                    if (data.canvasSize) setCanvasSize(data.canvasSize);
                    toast.success('Template imported');
                } catch (err) {
                    toast.error('Invalid template file');
                }
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    // Remove background image
    const handleRemoveBackground = () => {
        setBackgroundImage(null);
        setBackgroundSettings({
            opacity: 1,
            filters: { brightness: 0, contrast: 0, blur: 0, grayscale: false },
        });
        toast.success('Background removed');
    };

    // Upload PDF and convert to image for editing
    const handlePdfUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error('Please upload a PDF file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('PDF too large. Max 10MB allowed.');
            return;
        }

        try {
            toast.loading('Converting PDF...', { id: 'pdf-loading' });

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1); // Get first page

            // Scale for good quality
            const scale = 2;
            const viewport = page.getViewport({ scale });

            // Create canvas to render PDF
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            // Convert canvas to image
            const imageDataUrl = canvas.toDataURL('image/png');

            // Set as background
            setBackgroundImage(imageDataUrl);

            // Get ORIGINAL PDF page dimensions (without scale factor)
            // The viewport at scale=1 gives us the actual PDF page size
            const originalViewport = page.getViewport({ scale: 1 });
            const pdfWidth = originalViewport.width;
            const pdfHeight = originalViewport.height;

            console.log(`[PDF Upload] Original PDF size: ${pdfWidth}x${pdfHeight}, Rendered at: ${viewport.width}x${viewport.height}`);

            // Store original dimensions for reference
            setOriginalPdfSize({ width: pdfWidth, height: pdfHeight });

            // Set canvas to match ORIGINAL PDF dimensions (not scaled)
            // This ensures text positioning matches the actual PDF
            setCanvasSize({ width: Math.round(pdfWidth), height: Math.round(pdfHeight) });
            setBackgroundSettings({
                opacity: 1,
                filters: { brightness: 0, contrast: 0, blur: 0, grayscale: false },
            });

            // Enable PDF mode for special editing view
            setIsPdfMode(true);
            setShowLivePreview(true);

            // Clear existing elements to start fresh with PDF template
            setElements([]);
            saveToHistory([]);

            toast.success(`PDF uploaded! Size: ${Math.round(pdfWidth)}×${Math.round(pdfHeight)}px`, { id: 'pdf-loading' });
        } catch (error) {
            console.error('PDF upload error:', error);
            toast.error('Failed to load PDF. Please try again.', { id: 'pdf-loading' });
        }

        e.target.value = ''; // Reset input
    };

    const handleAddText = () => {
        const newElement = {
            id: `text_${Date.now()}`,
            type: 'text',
            text: 'New Text',
            x: canvasSize.width / 2,
            y: canvasSize.height / 2,
            fontSize: 24,
            fontFamily: 'Arial',
            fill: '#000000',
            align: 'center',
            width: 200,
            offsetX: 100,
            shadowBlur: 0,
            shadowColor: '#000000',
            shadowOffsetX: 0,
            shadowOffsetY: 0,
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        saveToHistory(newElements);
        setSelectedId(newElement.id);
        toast.success('Text element added');
    };

    const handleAddShape = (shapeType) => {
        let newElement;
        const baseProps = {
            id: `shape_${Date.now()}`,
            type: 'shape',
            fill: '#3B82F6',
            stroke: '#1E40AF',
            strokeWidth: 2,
        };

        switch (shapeType) {
            case 'rect':
                newElement = { ...baseProps, shapeType: 'rect', x: 300, y: 250, width: 150, height: 100, cornerRadius: 0 };
                break;
            case 'circle':
                newElement = { ...baseProps, shapeType: 'circle', x: 400, y: 300, radius: 50 };
                break;
            case 'line':
                newElement = { ...baseProps, shapeType: 'line', x: 200, y: 300, points: [0, 0, 200, 0], strokeWidth: 3 };
                break;
            default:
                return;
        }

        const newElements = [...elements, newElement];
        setElements(newElements);
        saveToHistory(newElements);
        setSelectedId(newElement.id);
        toast.success(`${shapeType} added`);
    };

    const handleAddVariable = (variable) => {
        const newElement = {
            id: `var_${Date.now()}`,
            type: 'text',
            text: variable.key,
            x: canvasSize.width / 2,
            y: 200 + Math.random() * 100,
            fontSize: 36,
            fontFamily: 'Georgia',
            fill: '#3B82F6',
            fontStyle: 'bold',
            align: 'center',
            width: 400,
            offsetX: 200,
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        saveToHistory(newElements);
        setSelectedId(newElement.id);
        toast.success(`Added ${variable.key} variable`);
    };

    const handleDeleteSelected = () => {
        if (selectedId) {
            const newElements = elements.filter(el => el.id !== selectedId);
            setElements(newElements);
            saveToHistory(newElements);
            setSelectedId(null);
            toast.success('Element deleted');
        }
    };

    const handleDuplicate = () => {
        if (selectedId) {
            const element = elements.find(el => el.id === selectedId);
            if (element) {
                const newElement = {
                    ...element,
                    id: `${element.type}_${Date.now()}`,
                    x: element.x + 20,
                    y: element.y + 20,
                };
                const newElements = [...elements, newElement];
                setElements(newElements);
                saveToHistory(newElements);
                setSelectedId(newElement.id);
                toast.success('Element duplicated');
            }
        }
    };

    const handleCopy = () => {
        if (selectedId) {
            const element = elements.find(el => el.id === selectedId);
            if (element) {
                setCopiedElement({ ...element });
                toast.success('Element copied');
            }
        }
    };

    const handlePaste = () => {
        if (copiedElement) {
            const newElement = {
                ...copiedElement,
                id: `${copiedElement.type}_${Date.now()}`,
                x: copiedElement.x + 30,
                y: copiedElement.y + 30,
            };
            const newElements = [...elements, newElement];
            setElements(newElements);
            saveToHistory(newElements);
            setSelectedId(newElement.id);
            toast.success('Element pasted');
        }
    };

    const handleUpdateElement = (id, updates) => {
        const newElements = elements.map(el => el.id === id ? { ...el, ...updates } : el);
        setElements(newElements);
    };

    const handleUpdateElementWithHistory = (id, updates) => {
        const newElements = elements.map(el => el.id === id ? { ...el, ...updates } : el);
        setElements(newElements);
        saveToHistory(newElements);
    };

    // Layer management
    const moveLayer = (direction) => {
        if (!selectedId) return;
        const index = elements.findIndex(el => el.id === selectedId);
        if (index === -1) return;

        const newElements = [...elements];
        if (direction === 'up' && index < elements.length - 1) {
            [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
        } else if (direction === 'down' && index > 0) {
            [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
        } else if (direction === 'top') {
            const element = newElements.splice(index, 1)[0];
            newElements.push(element);
        } else if (direction === 'bottom') {
            const element = newElements.splice(index, 1)[0];
            newElements.unshift(element);
        }
        setElements(newElements);
        saveToHistory(newElements);
    };

    // Alignment functions
    const alignElement = (alignment) => {
        if (!selectedId) return;
        const element = elements.find(el => el.id === selectedId);
        if (!element) return;

        let updates = {};
        switch (alignment) {
            case 'left':
                updates = { x: 50 };
                break;
            case 'center':
                updates = { x: canvasSize.width / 2 };
                break;
            case 'right':
                updates = { x: canvasSize.width - 50 };
                break;
            case 'top':
                updates = { y: 50 };
                break;
            case 'middle':
                updates = { y: canvasSize.height / 2 };
                break;
            case 'bottom':
                updates = { y: canvasSize.height - 50 };
                break;
        }
        handleUpdateElementWithHistory(selectedId, updates);
    };

    const handleDownloadTemplate = () => {
        const uri = stageRef.current?.toDataURL({ pixelRatio: 2 });
        if (uri) {
            const link = document.createElement('a');
            link.download = 'certificate-template.png';
            link.href = uri;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Template downloaded in high quality');
        }
    };

    const handleNext = () => {
        if (certificateEnabled) {
            onNext({
                certificateTemplate: {
                    enabled: true,
                    elements,
                    backgroundImage,
                    backgroundSettings, // Include background filters/opacity
                    width: canvasSize.width,
                    height: canvasSize.height,
                    canvasSize: { // Also include as object for compatibility
                        width: canvasSize.width,
                        height: canvasSize.height,
                    },
                },
            });
        } else {
            onNext({ certificateTemplate: null });
        }
    };

    // Generate live certificate preview
    const handleGeneratePreview = async () => {
        if (!certificateEnabled) {
            toast.error('Enable certificate generation first');
            return;
        }

        setGeneratingPreview(true);
        try {
            // Build template with current state
            const template = {
                enabled: true,
                elements,
                backgroundImage,
                backgroundSettings,
                width: canvasSize.width,
                height: canvasSize.height,
                canvasSize: { width: canvasSize.width, height: canvasSize.height },
            };

            // Use first recipient or sample data
            const sampleRecipient = data.recipients?.[0] || {
                name: 'John Doe',
                email: 'john@example.com',
                date: new Date().toLocaleDateString(),
            };

            const response = await fetch('/api/email/certificate-preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ template, sampleRecipient }),
            });

            const result = await response.json();
            if (result.success) {
                setCertPreview(result.pdf);
                setShowPreviewModal(true);
                toast.success('Preview generated!');
            } else {
                toast.error(result.message || 'Failed to generate preview');
            }
        } catch (error) {
            console.error('Preview error:', error);
            toast.error('Failed to generate preview');
        } finally {
            setGeneratingPreview(false);
        }
    };

    const selectedElement = elements.find(el => el.id === selectedId);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                handleDeleteSelected();
            } else if (e.ctrlKey && e.key === 'c') {
                handleCopy();
            } else if (e.ctrlKey && e.key === 'v') {
                handlePaste();
            } else if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                handleDuplicate();
            } else if (e.ctrlKey && e.key === 'z') {
                handleUndo();
            } else if (e.ctrlKey && e.key === 'y') {
                handleRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, copiedElement, historyIndex]);

    return (
        <div className="card">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">🎨 Certificate Designer</h2>
                <p className="text-gray-400">Design professional certificates with our Canva-like editor</p>
            </div>

            {/* Enable Toggle */}
            <div className="mb-6 p-4 bg-github-hover border border-github-border rounded-lg">
                <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={certificateEnabled}
                        onChange={(e) => setCertificateEnabled(e.target.checked)}
                        className="w-5 h-5 rounded border-github-border"
                    />
                    <div>
                        <p className="text-white font-medium">Enable Certificate Generation</p>
                        <p className="text-sm text-gray-400">Create custom certificates for each recipient</p>
                    </div>
                </label>
            </div>

            {certificateEnabled && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    {/* Main Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-github-hover border border-github-border rounded-lg">
                        {/* File Operations */}
                        <div className="flex items-center gap-1 pr-3 border-r border-github-border">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleBackgroundUpload}
                                className="hidden"
                            />
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAddImage}
                                className="hidden"
                            />
                            <input
                                ref={templateInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleImportTemplate}
                                className="hidden"
                            />
                            <input
                                ref={pdfInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handlePdfUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => pdfInputRef.current?.click()}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors"
                                title="Upload PDF Certificate"
                            >
                                <FileText className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowTemplateGallery(true)}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors"
                                title="Template Gallery"
                            >
                                <LayoutTemplate className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors"
                                title="Upload Background"
                            >
                                <Upload className="w-5 h-5" />
                            </button>
                            {backgroundImage && (
                                <button
                                    onClick={() => setShowBackgroundSettings(!showBackgroundSettings)}
                                    className={`p-2 rounded transition-colors ${showBackgroundSettings ? 'bg-github-blue text-white' : 'hover:bg-github-dark text-gray-400 hover:text-white'}`}
                                    title="Background Settings"
                                >
                                    <Sliders className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={handleDownloadTemplate}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors"
                                title="Download as Image"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleGeneratePreview}
                                disabled={generatingPreview}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                                title="Live PDF Preview"
                            >
                                {generatingPreview ? (
                                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                            <button
                                onClick={handleExportTemplate}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors"
                                title="Export Template JSON"
                            >
                                <FileJson className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => templateInputRef.current?.click()}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors"
                                title="Import Template JSON"
                            >
                                <Import className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Add Elements */}
                        <div className="flex items-center gap-1 pr-3 border-r border-github-border">
                            <button
                                onClick={handleAddText}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors"
                                title="Add Text"
                            >
                                <Type className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => imageInputRef.current?.click()}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors"
                                title="Add Image (Logo, Signature)"
                            >
                                <ImageIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleAddShape('rect')}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors"
                                title="Add Rectangle"
                            >
                                <Square className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleAddShape('circle')}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors"
                                title="Add Circle"
                            >
                                <CircleIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleAddShape('line')}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors"
                                title="Add Line"
                            >
                                <Minus className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Edit Operations */}
                        <div className="flex items-center gap-1 pr-3 border-r border-github-border">
                            <button
                                onClick={handleUndo}
                                disabled={historyIndex <= 0}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                                title="Undo (Ctrl+Z)"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleCopy}
                                disabled={!selectedId}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                                title="Copy (Ctrl+C)"
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleDuplicate}
                                disabled={!selectedId}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                                title="Duplicate (Ctrl+D)"
                            >
                                <Layers className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                disabled={!selectedId}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
                                title="Delete"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Alignment */}
                        <div className="flex items-center gap-1 pr-3 border-r border-github-border">
                            <button
                                onClick={() => alignElement('left')}
                                disabled={!selectedId}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                                title="Align Left"
                            >
                                <AlignLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => alignElement('center')}
                                disabled={!selectedId}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                                title="Align Center"
                            >
                                <AlignCenter className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => alignElement('right')}
                                disabled={!selectedId}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                                title="Align Right"
                            >
                                <AlignRight className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => alignElement('middle')}
                                disabled={!selectedId}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                                title="Align Middle"
                            >
                                <AlignVerticalJustifyCenter className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Layer Management */}
                        <div className="flex items-center gap-1 pr-3 border-r border-github-border">
                            <button
                                onClick={() => moveLayer('up')}
                                disabled={!selectedId}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                                title="Bring Forward"
                            >
                                <ChevronUp className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => moveLayer('down')}
                                disabled={!selectedId}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                                title="Send Backward"
                            >
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Zoom */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors"
                                title="Zoom Out"
                            >
                                <ZoomOut className="w-5 h-5" />
                            </button>
                            <span className="text-sm text-gray-400 min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
                            <button
                                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                                className="p-2 rounded hover:bg-github-dark text-gray-400 hover:text-white transition-colors"
                                title="Zoom In"
                            >
                                <ZoomIn className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Template Gallery Modal */}
                    {showTemplateGallery && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                            onClick={() => setShowTemplateGallery(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-github-card border border-github-border rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                                    <LayoutTemplate className="w-6 h-6 mr-2 text-github-blue" />
                                    Template Gallery
                                </h3>
                                <p className="text-gray-400 mb-4 text-sm">Choose a template to start designing your certificate</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {TEMPLATES.map((template) => (
                                        <button
                                            key={template.id}
                                            onClick={() => handleApplyTemplate(template)}
                                            className="p-4 bg-github-hover border border-github-border rounded-lg hover:border-github-blue transition-all group text-left"
                                        >
                                            <div className="text-4xl text-center mb-2">{template.preview}</div>
                                            <p className="text-white font-medium text-sm text-center group-hover:text-github-blue transition-colors">
                                                {template.name}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowTemplateGallery(false)}
                                    className="mt-4 w-full py-2 bg-github-dark border border-github-border rounded-lg text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* Background Settings Panel */}
                    {showBackgroundSettings && backgroundImage && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 bg-github-hover border border-github-border rounded-lg"
                        >
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-white font-medium flex items-center text-sm">
                                    <Sliders className="w-4 h-4 mr-2" />
                                    Background Settings
                                </h3>
                                <button
                                    onClick={handleRemoveBackground}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Remove Background
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">
                                        <Sun className="w-3 h-3 inline mr-1" />
                                        Opacity: {Math.round(backgroundSettings.opacity * 100)}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={backgroundSettings.opacity}
                                        onChange={(e) => setBackgroundSettings({
                                            ...backgroundSettings,
                                            opacity: parseFloat(e.target.value)
                                        })}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">
                                        <Sun className="w-3 h-3 inline mr-1" />
                                        Brightness: {backgroundSettings.filters.brightness}
                                    </label>
                                    <input
                                        type="range"
                                        min="-1"
                                        max="1"
                                        step="0.1"
                                        value={backgroundSettings.filters.brightness}
                                        onChange={(e) => setBackgroundSettings({
                                            ...backgroundSettings,
                                            filters: { ...backgroundSettings.filters, brightness: parseFloat(e.target.value) }
                                        })}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">
                                        <Contrast className="w-3 h-3 inline mr-1" />
                                        Contrast: {backgroundSettings.filters.contrast}
                                    </label>
                                    <input
                                        type="range"
                                        min="-100"
                                        max="100"
                                        step="10"
                                        value={backgroundSettings.filters.contrast}
                                        onChange={(e) => setBackgroundSettings({
                                            ...backgroundSettings,
                                            filters: { ...backgroundSettings.filters, contrast: parseInt(e.target.value) }
                                        })}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">
                                        <Droplets className="w-3 h-3 inline mr-1" />
                                        Blur: {backgroundSettings.filters.blur}px
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="20"
                                        step="1"
                                        value={backgroundSettings.filters.blur}
                                        onChange={(e) => setBackgroundSettings({
                                            ...backgroundSettings,
                                            filters: { ...backgroundSettings.filters, blur: parseInt(e.target.value) }
                                        })}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 mt-3 text-gray-400 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={backgroundSettings.filters.grayscale}
                                    onChange={(e) => setBackgroundSettings({
                                        ...backgroundSettings,
                                        filters: { ...backgroundSettings.filters, grayscale: e.target.checked }
                                    })}
                                    className="rounded"
                                />
                                Grayscale
                            </label>
                        </motion.div>
                    )}

                    {/* PDF Mode Info Bar */}
                    {isPdfMode && originalPdfSize && (
                        <div className="p-3 bg-gradient-to-r from-github-blue/10 to-github-purple/10 border border-github-blue/30 rounded-lg flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center text-github-blue">
                                    <FileText className="w-5 h-5 mr-2" />
                                    <span className="font-medium">PDF Certificate Mode</span>
                                </div>
                                <div className="text-sm text-gray-400">
                                    Original Size: <span className="text-white font-mono">{Math.round(originalPdfSize.width)} × {Math.round(originalPdfSize.height)}</span> px
                                </div>
                                <div className="text-sm text-gray-400">
                                    Canvas: <span className="text-white font-mono">{canvasSize.width} × {canvasSize.height}</span> px
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <label className="flex items-center space-x-2 text-sm text-gray-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showLivePreview}
                                        onChange={(e) => setShowLivePreview(e.target.checked)}
                                        className="rounded"
                                    />
                                    <span>Live Preview</span>
                                </label>
                                <button
                                    onClick={() => {
                                        setIsPdfMode(false);
                                        setOriginalPdfSize(null);
                                        setBackgroundImage(null);
                                        setElements([]);
                                        setCanvasSize({ width: 800, height: 600 });
                                    }}
                                    className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                                >
                                    Clear PDF
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Variables Panel */}
                    <div className="p-3 bg-github-hover border border-github-border rounded-lg">
                        <h3 className="text-white font-medium mb-2 flex items-center text-sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Dynamic Variables (click to add)
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {variables.map((variable) => (
                                <button
                                    key={variable.key}
                                    onClick={() => handleAddVariable(variable)}
                                    className="px-3 py-1.5 bg-github-dark border border-github-border rounded text-sm text-gray-300 hover:bg-github-blue hover:text-white hover:border-github-blue transition-all"
                                >
                                    <code className="text-github-blue">{variable.key}</code>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                        {/* Canvas Area */}
                        <div className="xl:col-span-3" ref={containerRef}>
                            <div
                                className="bg-gray-200 rounded-lg p-4 border-2 border-github-border overflow-auto"
                                style={{ minHeight: '400px', maxHeight: '80vh' }}
                            >
                                <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                                    <Stage
                                        ref={stageRef}
                                        width={canvasSize.width}
                                        height={canvasSize.height}
                                        onMouseDown={(e) => {
                                            const clickedOnEmpty = e.target === e.target.getStage();
                                            if (clickedOnEmpty) {
                                                setSelectedId(null);
                                            }
                                        }}
                                        style={{ background: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
                                    >
                                        <Layer>
                                            {/* Background */}
                                            {backgroundImage ? (
                                                <BackgroundImage
                                                    src={backgroundImage}
                                                    width={canvasSize.width}
                                                    height={canvasSize.height}
                                                    opacity={backgroundSettings.opacity}
                                                    filters={backgroundSettings.filters}
                                                />
                                            ) : (
                                                <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill="white" />
                                            )}

                                            {/* Elements */}
                                            {elements.map((element) => (
                                                element.type === 'text' ? (
                                                    <EditableText
                                                        key={element.id}
                                                        element={element}
                                                        isSelected={element.id === selectedId}
                                                        onSelect={() => setSelectedId(element.id)}
                                                        onChange={(updates) => handleUpdateElement(element.id, updates)}
                                                        onDblClick={() => setEditingTextId(element.id)}
                                                    />
                                                ) : element.type === 'shape' ? (
                                                    <ShapeElement
                                                        key={element.id}
                                                        element={element}
                                                        isSelected={element.id === selectedId}
                                                        onSelect={() => setSelectedId(element.id)}
                                                        onChange={(updates) => handleUpdateElement(element.id, updates)}
                                                    />
                                                ) : element.type === 'image' ? (
                                                    <ImageElement
                                                        key={element.id}
                                                        element={element}
                                                        isSelected={element.id === selectedId}
                                                        onSelect={() => setSelectedId(element.id)}
                                                        onChange={(updates) => handleUpdateElement(element.id, updates)}
                                                    />
                                                ) : null
                                            ))}
                                        </Layer>
                                    </Stage>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                💡 Shortcuts: Delete (remove), Ctrl+C (copy), Ctrl+V (paste), Ctrl+D (duplicate), Ctrl+Z (undo)
                            </p>
                        </div>

                        {/* Properties Panel */}
                        <div className="space-y-4">
                            {/* Canvas Size */}
                            <div className="p-3 bg-github-hover border border-github-border rounded-lg">
                                <h3 className="text-white font-medium mb-3 text-sm">Canvas Size</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-400">Width</label>
                                        <input
                                            type="number"
                                            value={canvasSize.width}
                                            onChange={(e) => setCanvasSize({ ...canvasSize, width: parseInt(e.target.value) || 800 })}
                                            className="input-field text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">Height</label>
                                        <input
                                            type="number"
                                            value={canvasSize.height}
                                            onChange={(e) => setCanvasSize({ ...canvasSize, height: parseInt(e.target.value) || 600 })}
                                            className="input-field text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => setCanvasSize({ width: 800, height: 600 })}
                                        className="text-xs px-2 py-1 bg-github-dark rounded text-gray-400 hover:text-white"
                                    >
                                        4:3
                                    </button>
                                    <button
                                        onClick={() => setCanvasSize({ width: 1024, height: 576 })}
                                        className="text-xs px-2 py-1 bg-github-dark rounded text-gray-400 hover:text-white"
                                    >
                                        16:9
                                    </button>
                                    <button
                                        onClick={() => setCanvasSize({ width: 800, height: 800 })}
                                        className="text-xs px-2 py-1 bg-github-dark rounded text-gray-400 hover:text-white"
                                    >
                                        1:1
                                    </button>
                                </div>
                            </div>

                            {selectedElement ? (
                                <div className="p-3 bg-github-hover border border-github-border rounded-lg space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-white font-medium text-sm">Properties</h3>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleUpdateElementWithHistory(selectedId, { locked: !selectedElement.locked })}
                                                className={`p-1 rounded ${selectedElement.locked ? 'text-github-orange' : 'text-gray-400'}`}
                                                title={selectedElement.locked ? 'Unlock' : 'Lock'}
                                            >
                                                {selectedElement.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleUpdateElementWithHistory(selectedId, { hidden: !selectedElement.hidden })}
                                                className={`p-1 rounded ${selectedElement.hidden ? 'text-github-red' : 'text-gray-400'}`}
                                                title={selectedElement.hidden ? 'Show' : 'Hide'}
                                            >
                                                {selectedElement.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {selectedElement.type === 'text' && (
                                        <>
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Text</label>
                                                <textarea
                                                    value={selectedElement.text}
                                                    onChange={(e) => handleUpdateElement(selectedId, { text: e.target.value })}
                                                    onBlur={() => saveToHistory(elements)}
                                                    className="input-field text-sm"
                                                    rows="2"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">Font Size</label>
                                                    <input
                                                        type="number"
                                                        value={selectedElement.fontSize}
                                                        onChange={(e) => handleUpdateElement(selectedId, { fontSize: parseInt(e.target.value) })}
                                                        onBlur={() => saveToHistory(elements)}
                                                        className="input-field text-sm"
                                                        min="8"
                                                        max="200"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">Rotation</label>
                                                    <input
                                                        type="number"
                                                        value={selectedElement.rotation || 0}
                                                        onChange={(e) => handleUpdateElement(selectedId, { rotation: parseInt(e.target.value) })}
                                                        onBlur={() => saveToHistory(elements)}
                                                        className="input-field text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Font Family</label>
                                                <select
                                                    value={selectedElement.fontFamily}
                                                    onChange={(e) => handleUpdateElementWithHistory(selectedId, { fontFamily: e.target.value })}
                                                    className="input-field text-sm"
                                                >
                                                    {FONTS.map(font => (
                                                        <option key={font} value={font}>{font}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Color</label>
                                                <div className="flex gap-2 items-center">
                                                    <input
                                                        type="color"
                                                        value={selectedElement.fill}
                                                        onChange={(e) => handleUpdateElement(selectedId, { fill: e.target.value })}
                                                        onBlur={() => saveToHistory(elements)}
                                                        className="w-10 h-8 rounded border border-github-border cursor-pointer"
                                                    />
                                                    <div className="flex flex-wrap gap-1 flex-1">
                                                        {PRESET_COLORS.slice(0, 12).map(color => (
                                                            <button
                                                                key={color}
                                                                onClick={() => handleUpdateElementWithHistory(selectedId, { fill: color })}
                                                                className="w-5 h-5 rounded border border-github-border hover:scale-110 transition-transform"
                                                                style={{ backgroundColor: color }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Style</label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleUpdateElementWithHistory(selectedId, {
                                                            fontStyle: selectedElement.fontStyle?.includes('bold')
                                                                ? selectedElement.fontStyle.replace('bold', '').trim()
                                                                : `${selectedElement.fontStyle || ''} bold`.trim()
                                                        })}
                                                        className={`p-2 rounded ${selectedElement.fontStyle?.includes('bold') ? 'bg-github-blue text-white' : 'bg-github-dark text-gray-400'}`}
                                                    >
                                                        <Bold className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateElementWithHistory(selectedId, {
                                                            fontStyle: selectedElement.fontStyle?.includes('italic')
                                                                ? selectedElement.fontStyle.replace('italic', '').trim()
                                                                : `${selectedElement.fontStyle || ''} italic`.trim()
                                                        })}
                                                        className={`p-2 rounded ${selectedElement.fontStyle?.includes('italic') ? 'bg-github-blue text-white' : 'bg-github-dark text-gray-400'}`}
                                                    >
                                                        <Italic className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Opacity</label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.1"
                                                    value={selectedElement.opacity || 1}
                                                    onChange={(e) => handleUpdateElement(selectedId, { opacity: parseFloat(e.target.value) })}
                                                    onMouseUp={() => saveToHistory(elements)}
                                                    className="w-full"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {selectedElement.type === 'shape' && (
                                        <>
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Fill Color</label>
                                                <div className="flex gap-2 items-center">
                                                    <input
                                                        type="color"
                                                        value={selectedElement.fill === 'transparent' ? '#ffffff' : selectedElement.fill}
                                                        onChange={(e) => handleUpdateElement(selectedId, { fill: e.target.value })}
                                                        onBlur={() => saveToHistory(elements)}
                                                        className="w-10 h-8 rounded border border-github-border cursor-pointer"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateElementWithHistory(selectedId, { fill: 'transparent' })}
                                                        className="text-xs px-2 py-1 bg-github-dark rounded text-gray-400 hover:text-white"
                                                    >
                                                        Transparent
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Stroke Color</label>
                                                <input
                                                    type="color"
                                                    value={selectedElement.stroke || '#000000'}
                                                    onChange={(e) => handleUpdateElement(selectedId, { stroke: e.target.value })}
                                                    onBlur={() => saveToHistory(elements)}
                                                    className="w-full h-8 rounded border border-github-border cursor-pointer"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Stroke Width</label>
                                                <input
                                                    type="number"
                                                    value={selectedElement.strokeWidth || 0}
                                                    onChange={(e) => handleUpdateElement(selectedId, { strokeWidth: parseInt(e.target.value) })}
                                                    onBlur={() => saveToHistory(elements)}
                                                    className="input-field text-sm"
                                                    min="0"
                                                    max="20"
                                                />
                                            </div>

                                            {selectedElement.shapeType === 'rect' && (
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">Corner Radius</label>
                                                    <input
                                                        type="number"
                                                        value={selectedElement.cornerRadius || 0}
                                                        onChange={(e) => handleUpdateElement(selectedId, { cornerRadius: parseInt(e.target.value) })}
                                                        onBlur={() => saveToHistory(elements)}
                                                        className="input-field text-sm"
                                                        min="0"
                                                        max="100"
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Opacity</label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.1"
                                                    value={selectedElement.opacity || 1}
                                                    onChange={(e) => handleUpdateElement(selectedId, { opacity: parseFloat(e.target.value) })}
                                                    onMouseUp={() => saveToHistory(elements)}
                                                    className="w-full"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {selectedElement.type === 'image' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">Width</label>
                                                    <input
                                                        type="number"
                                                        value={Math.round(selectedElement.width)}
                                                        onChange={(e) => handleUpdateElement(selectedId, { width: parseInt(e.target.value) || 50 })}
                                                        onBlur={() => saveToHistory(elements)}
                                                        className="input-field text-sm"
                                                        min="20"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">Height</label>
                                                    <input
                                                        type="number"
                                                        value={Math.round(selectedElement.height)}
                                                        onChange={(e) => handleUpdateElement(selectedId, { height: parseInt(e.target.value) || 50 })}
                                                        onBlur={() => saveToHistory(elements)}
                                                        className="input-field text-sm"
                                                        min="20"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">Rotation</label>
                                                    <input
                                                        type="number"
                                                        value={selectedElement.rotation || 0}
                                                        onChange={(e) => handleUpdateElement(selectedId, { rotation: parseInt(e.target.value) })}
                                                        onBlur={() => saveToHistory(elements)}
                                                        className="input-field text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">Opacity</label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="1"
                                                        step="0.1"
                                                        value={selectedElement.opacity || 1}
                                                        onChange={(e) => handleUpdateElement(selectedId, { opacity: parseFloat(e.target.value) })}
                                                        onMouseUp={() => saveToHistory(elements)}
                                                        className="w-full"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Shadow Blur</label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="30"
                                                    step="1"
                                                    value={selectedElement.shadowBlur || 0}
                                                    onChange={(e) => handleUpdateElement(selectedId, { shadowBlur: parseInt(e.target.value) })}
                                                    onMouseUp={() => saveToHistory(elements)}
                                                    className="w-full"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Position */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">X</label>
                                            <input
                                                type="number"
                                                value={Math.round(selectedElement.x)}
                                                onChange={(e) => handleUpdateElement(selectedId, { x: parseInt(e.target.value) })}
                                                onBlur={() => saveToHistory(elements)}
                                                className="input-field text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Y</label>
                                            <input
                                                type="number"
                                                value={Math.round(selectedElement.y)}
                                                onChange={(e) => handleUpdateElement(selectedId, { y: parseInt(e.target.value) })}
                                                onBlur={() => saveToHistory(elements)}
                                                className="input-field text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-github-hover border border-github-border rounded-lg text-center">
                                    <Move className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">
                                        Click on an element to edit
                                    </p>
                                </div>
                            )}

                            {/* Layers Panel */}
                            <div className="p-3 bg-github-hover border border-github-border rounded-lg">
                                <h3 className="text-white font-medium mb-2 text-sm flex items-center">
                                    <Layers className="w-4 h-4 mr-2" />
                                    Layers ({elements.length})
                                </h3>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {[...elements].reverse().map((el) => (
                                        <div
                                            key={el.id}
                                            onClick={() => setSelectedId(el.id)}
                                            className={`px-2 py-1.5 rounded text-xs cursor-pointer flex items-center justify-between ${el.id === selectedId ? 'bg-github-blue text-white' : 'bg-github-dark text-gray-400 hover:bg-github-dark/80'
                                                }`}
                                        >
                                            <span className="truncate flex-1">
                                                {el.type === 'text' ? el.text.substring(0, 20) : el.shapeType}
                                            </span>
                                            <div className="flex gap-1 ml-2">
                                                {el.locked && <Lock className="w-3 h-3" />}
                                                {el.hidden && <EyeOff className="w-3 h-3" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* PDF Preview Modal */}
            {showPreviewModal && certPreview && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowPreviewModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="bg-github-card border border-github-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-github-border flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg flex items-center">
                                <Eye className="w-5 h-5 mr-2 text-github-blue" />
                                Live Certificate Preview
                            </h3>
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-400 mb-4">
                                This is exactly how your certificate will look when sent to recipients.
                            </p>
                            <iframe
                                title="Certificate PDF Preview"
                                src={certPreview}
                                className="w-full bg-white rounded"
                                style={{
                                    minHeight: '500px',
                                    height: 'auto',
                                    aspectRatio: canvasSize.width && canvasSize.height
                                        ? `${canvasSize.width} / ${canvasSize.height}`
                                        : '4 / 3'
                                }}
                            />
                        </div>
                    </motion.div>
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
