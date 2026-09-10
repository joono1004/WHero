param(
  [string]$GeneratedRoot = "C:\Users\이준호\.codex\generated_images\01a07e5b-f77f-7fa1-98f1-a784c31d3803",
  [string]$OutputDirectory = "$PSScriptRoot\..\public\art\units\infantry-right-safe"
)

Add-Type -AssemblyName System.Drawing

$processor = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;

public static class InfantryRightSafeAtlasBuilder {
  static bool IsMagenta(Color p) { return p.R > 110 && p.B > 125 && p.R - p.G > 65 && p.B - p.G > 75; }
  public static void Build(string sourcePath, string outputPath, int columns, int rows) {
    using (var source = (Bitmap)Image.FromFile(sourcePath))
    using (var keyed = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb)) {
      for (var y = 0; y < source.Height; y++) for (var x = 0; x < source.Width; x++) { var p = source.GetPixel(x, y); keyed.SetPixel(x, y, IsMagenta(p) ? Color.Transparent : p); }
      const int destinationWidth = 320, destinationHeight = 360, baseline = 338;
      using (var atlas = new Bitmap(destinationWidth, destinationHeight * columns * rows, PixelFormat.Format32bppArgb))
      using (var g = Graphics.FromImage(atlas)) {
        g.Clear(Color.Transparent); g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        for (var frame = 0; frame < columns * rows; frame++) {
          var column = frame % columns; var row = frame / columns;
          var left = source.Width * column / columns; var right = source.Width * (column + 1) / columns;
          var top = source.Height * row / rows; var bottom = source.Height * (row + 1) / rows;
          var sourceRect = Rectangle.FromLTRB(left, top, right, bottom);
          var scale = Math.Min((float)destinationWidth / sourceRect.Width, (float)destinationHeight / sourceRect.Height);
          var drawWidth = (int)Math.Round(sourceRect.Width * scale); var drawHeight = (int)Math.Round(sourceRect.Height * scale);
          var drawX = (destinationWidth - drawWidth) / 2; var drawY = frame * destinationHeight + baseline - drawHeight;
          g.DrawImage(keyed, new Rectangle(drawX, drawY, drawWidth, drawHeight), sourceRect, GraphicsUnit.Pixel);
        }
        atlas.Save(outputPath, ImageFormat.Png);
      }
    }
  }
}
'@

$drawingDirectory = Split-Path ([System.Drawing.Bitmap].Assembly.Location)
$references = @([System.Drawing.Bitmap].Assembly.Location, [System.Drawing.Color].Assembly.Location, (Join-Path $drawingDirectory 'System.Private.Windows.Core.dll'), (Join-Path $drawingDirectory 'System.Private.Windows.GdiPlus.dll'))
Add-Type -TypeDefinition $processor -Language CSharp -ReferencedAssemblies $references
New-Item -ItemType Directory -Force $OutputDirectory | Out-Null
$sets = @(
  @{ Name='ready'; Input='exec-788eb4c0-03b0-4758-8d89-9e9546e8c3fa.png'; Columns=3; Rows=2 },
  @{ Name='move'; Input='exec-66c8528f-2842-470a-be2e-48c9037baf31.png'; Columns=4; Rows=2 },
  @{ Name='attack'; Input='exec-4deb3cc3-6126-4865-9a9f-64823e817083.png'; Columns=5; Rows=2 },
  @{ Name='hurt'; Input='exec-43e06744-f333-4379-8365-f8b03bbe8338.png'; Columns=3; Rows=2 },
  @{ Name='death'; Input='exec-5a4dcb79-6616-471e-b775-31dbede92268.png'; Columns=3; Rows=2 }
)
foreach ($set in $sets) { [InfantryRightSafeAtlasBuilder]::Build((Join-Path $GeneratedRoot $set.Input), (Join-Path $OutputDirectory "$($set.Name).png"), $set.Columns, $set.Rows) }
