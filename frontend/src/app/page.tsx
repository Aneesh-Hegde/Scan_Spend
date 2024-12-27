"use client";
import React, { useState } from 'react';
import Upload from './components/Upload';
import ProductList from './components/ProductList';

const Home: React.FC = () => {
  const [filename, setFilename] = useState<string | null>(null);

  return (
    <div>
      <h1>Product Manager</h1>
      <Upload />
      {filename && <ProductList filename={filename} />}
    </div>
  );
};

export default Home;

