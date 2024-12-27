"use client";
import React, { useState } from 'react';
import Upload from './components/Upload';
import ProductList from './components/ProductList';

const Home: React.FC = () => {
  const [filename, setFilename] = useState<string>('');

  return (
    <div>
      <h1>Product Manager</h1>
      <Upload onFileSelect={setFilename} />
      {filename && filename !== '' && <ProductList filename={filename} />}
    </div>
  );
};

export default Home;

