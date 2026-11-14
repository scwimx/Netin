// Módulo nativo de Netin para React Native for Windows.
// Expone a JavaScript (NativeModules.NetinNativo):
//   archivos en %LOCALAPPDATA%\Netin\datos, azar seguro (BCrypt),
//   foto con la cámara (MediaCapture) y apertura de documentos locales.
// Se copia a windows\Netin\ y se registra en el ReactPackageProvider de la app.
#pragma once

#include "pch.h"

#include <NativeModules.h>
#include <bcrypt.h>
#include <shlobj.h>
#include <shellapi.h>
#include <wincrypt.h>

#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>

#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Media.Capture.h>
#include <winrt/Windows.Media.MediaProperties.h>
#include <winrt/Windows.Storage.Streams.h>

#pragma comment(lib, "bcrypt.lib")
#pragma comment(lib, "crypt32.lib")
#pragma comment(lib, "shell32.lib")

namespace NetinApp {

namespace fs = std::filesystem;

inline fs::path CarpetaBase() {
  PWSTR ruta = nullptr;
  fs::path base;
  if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, nullptr, &ruta))) {
    base = fs::path(ruta) / L"Netin";
  }
  CoTaskMemFree(ruta);
  return base;
}
inline fs::path CarpetaDatos() {
  auto p = CarpetaBase() / L"datos";
  fs::create_directories(p);
  return p;
}
inline fs::path CarpetaDocumentos() {
  auto p = CarpetaBase() / L"documentos";
  fs::create_directories(p);
  return p;
}

// Resuelve una ruta relativa dentro de una carpeta, sin permitir salir de ella.
inline fs::path Dentro(fs::path const &base, std::string const &relativa) {
  auto p = (base / winrt::to_hstring(relativa).c_str()).lexically_normal();
  auto b = base.lexically_normal().wstring();
  if (p.wstring().rfind(b, 0) != 0 || relativa.find("..") != std::string::npos) {
    throw std::runtime_error("Ruta no permitida");
  }
  return p;
}

inline std::string Base64(uint8_t const *datos, DWORD largo) {
  DWORD n = 0;
  CryptBinaryToStringA(datos, largo, CRYPT_STRING_BASE64 | CRYPT_STRING_NOCRLF, nullptr, &n);
  std::string s(n, '\0');
  CryptBinaryToStringA(datos, largo, CRYPT_STRING_BASE64 | CRYPT_STRING_NOCRLF, s.data(), &n);
  s.resize(n);
  return s;
}

REACT_MODULE(NetinNativo)
struct NetinNativo {
  REACT_METHOD(leerTexto)
  void leerTexto(std::string ruta, winrt::Microsoft::ReactNative::ReactPromise<winrt::Microsoft::ReactNative::JSValue> promesa) noexcept {
    try {
      auto p = Dentro(CarpetaDatos(), ruta);
      if (!fs::exists(p)) {
        promesa.Resolve(nullptr);
        return;
      }
      std::ifstream f(p, std::ios::binary);
      std::stringstream ss;
      ss << f.rdbuf();
      promesa.Resolve(ss.str());
    } catch (std::exception const &e) {
      promesa.Reject(e.what());
    }
  }

  REACT_METHOD(escribirTexto)
  void escribirTexto(std::string ruta, std::string texto, winrt::Microsoft::ReactNative::ReactPromise<void> promesa) noexcept {
    try {
      auto p = Dentro(CarpetaDatos(), ruta);
      fs::create_directories(p.parent_path());
      auto temporal = p;
      temporal += L".tmp";
      {
        std::ofstream f(temporal, std::ios::binary | std::ios::trunc);
        f.write(texto.data(), static_cast<std::streamsize>(texto.size()));
        if (!f) throw std::runtime_error("No se pudo escribir el archivo");
      }
      // Reemplazo atómico: nunca queda un archivo a medio escribir.
      if (!MoveFileExW(temporal.c_str(), p.c_str(), MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH)) {
        throw std::runtime_error("No se pudo reemplazar el archivo");
      }
      promesa.Resolve();
    } catch (std::exception const &e) {
      promesa.Reject(e.what());
    }
  }

  REACT_METHOD(borrar)
  void borrar(std::string ruta, winrt::Microsoft::ReactNative::ReactPromise<void> promesa) noexcept {
    try {
      fs::remove_all(Dentro(CarpetaDatos(), ruta));
      promesa.Resolve();
    } catch (std::exception const &e) {
      promesa.Reject(e.what());
    }
  }

  REACT_METHOD(aleatorioBase64)
  void aleatorioBase64(int n, winrt::Microsoft::ReactNative::ReactPromise<std::string> promesa) noexcept {
    if (n <= 0 || n > 4096) {
      promesa.Reject("Cantidad no válida");
      return;
    }
    std::string bytes(static_cast<size_t>(n), '\0');
    if (BCryptGenRandom(nullptr, reinterpret_cast<PUCHAR>(bytes.data()), n, BCRYPT_USE_SYSTEM_PREFERRED_RNG) != 0) {
      promesa.Reject("No se pudo generar azar seguro");
      return;
    }
    promesa.Resolve(Base64(reinterpret_cast<uint8_t const *>(bytes.data()), n));
  }

  // Toma una foto con la cámara predeterminada y la devuelve como JPEG en base64.
  REACT_METHOD(tomarFoto)
  winrt::fire_and_forget tomarFoto(winrt::Microsoft::ReactNative::ReactPromise<std::string> promesa) noexcept {
    try {
      winrt::Windows::Media::Capture::MediaCapture captura;
      winrt::Windows::Media::Capture::MediaCaptureInitializationSettings ajustes;
      ajustes.StreamingCaptureMode(winrt::Windows::Media::Capture::StreamingCaptureMode::Video);
      co_await captura.InitializeAsync(ajustes);
      winrt::Windows::Storage::Streams::InMemoryRandomAccessStream flujo;
      co_await captura.CapturePhotoToStreamAsync(winrt::Windows::Media::MediaProperties::ImageEncodingProperties::CreateJpeg(), flujo);
      auto tam = static_cast<uint32_t>(flujo.Size());
      winrt::Windows::Storage::Streams::DataReader lector(flujo.GetInputStreamAt(0));
      co_await lector.LoadAsync(tam);
      std::vector<uint8_t> datos(tam);
      lector.ReadBytes(datos);
      captura.Close();
      promesa.Resolve(Base64(datos.data(), tam));
    } catch (winrt::hresult_error const &e) {
      auto codigo = static_cast<uint32_t>(e.code());
      if (codigo == 0x80070005) {
        promesa.Reject("No hay permiso para usar la cámara. Actívalo en Configuración > Privacidad > Cámara.");
      } else if (codigo == 0xC00D36D5) {
        promesa.Reject("No se encontró una cámara.");
      } else {
        promesa.Reject("La cámara no está disponible.");
      }
    } catch (...) {
      promesa.Reject("La cámara no está disponible.");
    }
  }

  REACT_METHOD(carpetaDatos)
  void carpetaDatos(winrt::Microsoft::ReactNative::ReactPromise<std::string> promesa) noexcept {
    promesa.Resolve(winrt::to_string(CarpetaDatos().wstring()));
  }

  REACT_METHOD(carpetaDocumentos)
  void carpetaDocumentos(winrt::Microsoft::ReactNative::ReactPromise<std::string> promesa) noexcept {
    promesa.Resolve(winrt::to_string(CarpetaDocumentos().wstring()));
  }

  // Lista PDF y textos de la carpeta de documentos como JSON.
  REACT_METHOD(listarDocumentos)
  void listarDocumentos(winrt::Microsoft::ReactNative::ReactPromise<std::string> promesa) noexcept {
    try {
      auto base = CarpetaDocumentos();
      std::string json = "[";
      bool primero = true;
      for (auto const &e : fs::recursive_directory_iterator(base)) {
        if (!e.is_regular_file()) continue;
        auto ext = e.path().extension().wstring();
        for (auto &c : ext) c = static_cast<wchar_t>(towlower(c));
        if (ext != L".pdf" && ext != L".txt" && ext != L".md") continue;
        auto rel = fs::relative(e.path(), base).generic_wstring();
        std::string relUtf8 = winrt::to_string(rel);
        std::string escapado;
        for (char c : relUtf8) {
          if (c == '"' || c == '\\') escapado += '\\';
          escapado += c;
        }
        auto t = fs::last_write_time(e.path());
        auto seg = std::chrono::duration_cast<std::chrono::seconds>(t.time_since_epoch()).count() - 11644473600LL;
        if (!primero) json += ",";
        primero = false;
        json += "{\"archivo\":\"" + escapado + "\",\"bytes\":" + std::to_string(e.file_size()) + ",\"modificado\":\"" + std::to_string(seg) + "\"}";
      }
      json += "]";
      promesa.Resolve(json);
    } catch (std::exception const &e) {
      promesa.Reject(e.what());
    }
  }

  REACT_METHOD(abrirDocumento)
  void abrirDocumento(std::string archivo, winrt::Microsoft::ReactNative::ReactPromise<void> promesa) noexcept {
    try {
      auto p = Dentro(CarpetaDocumentos(), archivo);
      ShellExecuteW(nullptr, L"open", p.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
      promesa.Resolve();
    } catch (std::exception const &e) {
      promesa.Reject(e.what());
    }
  }
};

} // namespace NetinApp
