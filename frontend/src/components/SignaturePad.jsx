import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const SignaturePad = ({ onSave, onCancel }) => {
  const sigRef = useRef(null);

  const handleClear = () => sigRef.current?.clear();

  const handleSave = () => {
    if (sigRef.current?.isEmpty()) {
      alert('서명을 입력해주세요.');
      return;
    }
    const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
        <SignatureCanvas
          ref={sigRef}
          penColor="black"
          canvasProps={{
            className: 'w-full rounded-lg',
            style: { width: '100%', height: '150px' }
          }}
        />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className="btn-primary text-sm">서명 저장</button>
        <button onClick={handleClear} className="btn-secondary text-sm">지우기</button>
        {onCancel && <button onClick={onCancel} className="btn-secondary text-sm">취소</button>}
      </div>
    </div>
  );
};

export default SignaturePad;
