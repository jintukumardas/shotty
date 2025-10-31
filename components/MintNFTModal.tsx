'use client';

import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

interface MintNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMint: (data: {
    name: string;
    description: string;
    imageFile: File | null;
    attributes: Array<{ trait_type: string; value: string }>;
  }) => Promise<void>;
}

export default function MintNFTModal({ isOpen, onClose, onMint }: MintNFTModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<Array<{ trait_type: string; value: string }>>([]);
  const [isMinting, setIsMinting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }

      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddAttribute = () => {
    setAttributes([...attributes, { trait_type: '', value: '' }]);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleAttributeChange = (
    index: number,
    field: 'trait_type' | 'value',
    value: string
  ) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter an NFT name');
      return;
    }

    if (!description.trim()) {
      alert('Please enter an NFT description');
      return;
    }

    setIsMinting(true);

    try {
      await onMint({
        name: name.trim(),
        description: description.trim(),
        imageFile,
        attributes: attributes.filter((attr) => attr.trait_type && attr.value),
      });

      // Reset form
      setName('');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      setAttributes([]);
      onClose();
    } catch (error) {
      console.error('Error minting NFT:', error);
      alert(error instanceof Error ? error.message : 'Failed to mint NFT');
    } finally {
      setIsMinting(false);
    }
  };

  const handleClose = () => {
    if (!isMinting) {
      setName('');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      setAttributes([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] shadow-2xl">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Mint NFT</h2>
            <p className="text-xs text-gray-400 mt-1">Create your digital collectible</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isMinting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              NFT Image <span className="text-gray-500">(optional)</span>
            </label>
            <div className="space-y-3">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="NFT Preview"
                    className="w-full h-48 object-cover rounded-lg border border-[#2A2A2A]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    disabled={isMinting}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-8 text-center cursor-pointer hover:border-[#DD44B9] transition-colors"
                >
                  <ImageIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400 mb-1">Click to upload image</p>
                  <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={isMinting}
                className="hidden"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="nft-name" className="block text-sm font-medium text-gray-300 mb-2">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="nft-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isMinting}
              placeholder="My Amazing NFT"
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#DD44B9] transition-colors disabled:opacity-50"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="nft-description" className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              id="nft-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isMinting}
              placeholder="Describe your NFT..."
              rows={4}
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#DD44B9] transition-colors resize-none disabled:opacity-50"
              required
            />
          </div>

          {/* Attributes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Attributes <span className="text-gray-500">(optional)</span>
              </label>
              <button
                type="button"
                onClick={handleAddAttribute}
                disabled={isMinting}
                className="text-sm text-[#DD44B9] hover:text-[#FC519F] transition-colors disabled:opacity-50"
              >
                + Add Attribute
              </button>
            </div>
            {attributes.length > 0 && (
              <div className="space-y-2">
                {attributes.map((attr, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={attr.trait_type}
                      onChange={(e) => handleAttributeChange(index, 'trait_type', e.target.value)}
                      disabled={isMinting}
                      placeholder="Trait (e.g., Color)"
                      className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#DD44B9] transition-colors disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={attr.value}
                      onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                      disabled={isMinting}
                      placeholder="Value (e.g., Blue)"
                      className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#DD44B9] transition-colors disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveAttribute(index)}
                      disabled={isMinting}
                      className="text-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </form>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-[#2A2A2A] p-4 bg-[#1A1A1A]">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isMinting}
              className="flex-1 px-6 py-3 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isMinting || !name.trim() || !description.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#DD44B9] to-[#00D9FF] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isMinting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Minting...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Mint NFT
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
