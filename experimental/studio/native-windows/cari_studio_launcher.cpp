#include <windows.h>

#include <cstddef>
#include <string>
#include <vector>

namespace {

std::wstring module_directory() {
    wchar_t buffer[32768]{};
    const DWORD capacity = static_cast<DWORD>(sizeof(buffer) / sizeof(buffer[0]));
    const DWORD length = GetModuleFileNameW(nullptr, buffer, capacity);
    if (length == 0 || length >= capacity) {
        return {};
    }

    std::wstring path(buffer, buffer + length);
    const std::size_t slash = path.find_last_of(L"\\/");
    return slash == std::wstring::npos ? std::wstring{} : path.substr(0, slash);
}

bool file_exists(const std::wstring& path) {
    if (path.empty()) {
        return false;
    }

    const DWORD attributes = GetFileAttributesW(path.c_str());
    return attributes != INVALID_FILE_ATTRIBUTES &&
           (attributes & FILE_ATTRIBUTE_DIRECTORY) == 0;
}

std::wstring join_path(const std::wstring& left, const std::wstring& right) {
    if (left.empty()) {
        return right;
    }
    if (right.empty()) {
        return left;
    }

    if (left.back() == L'\\' || left.back() == L'/') {
        return left + right;
    }
    return left + L"\\" + right;
}

std::wstring env_value(const wchar_t* name) {
    wchar_t buffer[32768]{};
    const DWORD capacity = static_cast<DWORD>(sizeof(buffer) / sizeof(buffer[0]));
    const DWORD length = GetEnvironmentVariableW(name, buffer, capacity);
    if (length == 0 || length >= capacity) {
        return {};
    }
    return std::wstring(buffer, buffer + length);
}

std::wstring quote_argument(const std::wstring& value) {
    if (value.empty()) {
        return L"\"\"";
    }

    bool needs_quotes = false;
    for (const wchar_t character : value) {
        if (character == L' ' || character == L'\t' || character == L'"') {
            needs_quotes = true;
            break;
        }
    }

    if (!needs_quotes) {
        return value;
    }

    std::wstring result;
    result.push_back(L'"');
    unsigned backslashes = 0;

    for (const wchar_t character : value) {
        if (character == L'\\') {
            ++backslashes;
            continue;
        }

        if (character == L'"') {
            result.append(backslashes * 2u + 1u, L'\\');
            result.push_back(L'"');
            backslashes = 0;
            continue;
        }

        if (backslashes != 0) {
            result.append(backslashes, L'\\');
            backslashes = 0;
        }
        result.push_back(character);
    }

    result.append(backslashes * 2u, L'\\');
    result.push_back(L'"');
    return result;
}

std::wstring parent_directory(const std::wstring& path) {
    const std::size_t slash = path.find_last_of(L"\\/");
    return slash == std::wstring::npos ? std::wstring{} : path.substr(0, slash);
}

std::wstring first_existing(const std::vector<std::wstring>& candidates) {
    for (const auto& candidate : candidates) {
        if (file_exists(candidate)) {
            return candidate;
        }
    }
    return {};
}

std::wstring launcher_log_path(const std::wstring& fallback_root) {
    const std::wstring local_appdata = env_value(L"LOCALAPPDATA");
    if (!local_appdata.empty()) {
        const std::wstring directory = join_path(local_appdata, L"CariStudio");
        CreateDirectoryW(directory.c_str(), nullptr);
        return join_path(directory, L"launcher.log");
    }

    return join_path(fallback_root, L"CariStudio-launcher.log");
}

bool launch_executable(
    const std::wstring& executable,
    const std::wstring& working_directory) {
    std::wstring command_line = quote_argument(executable);
    std::vector<wchar_t> mutable_command(command_line.begin(), command_line.end());
    mutable_command.push_back(L'\0');

    STARTUPINFOW startup{};
    startup.cb = sizeof(startup);

    PROCESS_INFORMATION process{};
    const BOOL created = CreateProcessW(
        executable.c_str(),
        mutable_command.data(),
        nullptr,
        nullptr,
        FALSE,
        CREATE_NO_WINDOW,
        nullptr,
        working_directory.empty() ? nullptr : working_directory.c_str(),
        &startup,
        &process);

    if (!created) {
        return false;
    }

    CloseHandle(process.hThread);
    CloseHandle(process.hProcess);
    return true;
}

bool launch_development_shell(const std::wstring& repository_root) {
    const std::wstring script =
        join_path(repository_root, L"experimental\\studio\\electron-shell\\run-local.ps1");
    if (!file_exists(script)) {
        return false;
    }

    const std::wstring log_path = launcher_log_path(repository_root);

    SECURITY_ATTRIBUTES security{};
    security.nLength = sizeof(security);
    security.bInheritHandle = TRUE;

    HANDLE log = CreateFileW(
        log_path.c_str(),
        FILE_APPEND_DATA,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        &security,
        OPEN_ALWAYS,
        FILE_ATTRIBUTE_NORMAL,
        nullptr);

    if (log == INVALID_HANDLE_VALUE) {
        log = nullptr;
    }

    const std::wstring system_root = env_value(L"SystemRoot");
    const std::wstring powershell =
        system_root.empty()
            ? L"powershell.exe"
            : join_path(
                system_root,
                L"System32\\WindowsPowerShell\\v1.0\\powershell.exe");

    const std::wstring command_line =
        quote_argument(powershell) +
        L" -NoProfile -ExecutionPolicy Bypass -File " +
        quote_argument(script);

    std::vector<wchar_t> mutable_command(
        command_line.begin(), command_line.end());
    mutable_command.push_back(L'\0');

    STARTUPINFOW startup{};
    startup.cb = sizeof(startup);

    if (log != nullptr) {
        startup.dwFlags |= STARTF_USESTDHANDLES;
        startup.hStdInput = GetStdHandle(STD_INPUT_HANDLE);
        startup.hStdOutput = log;
        startup.hStdError = log;
    }

    PROCESS_INFORMATION process{};
    const BOOL created = CreateProcessW(
        powershell.c_str(),
        mutable_command.data(),
        nullptr,
        nullptr,
        log != nullptr ? TRUE : FALSE,
        CREATE_NO_WINDOW,
        nullptr,
        repository_root.c_str(),
        &startup,
        &process);

    if (log != nullptr) {
        CloseHandle(log);
    }

    if (!created) {
        return false;
    }

    const DWORD wait_result = WaitForSingleObject(process.hProcess, 1500);

    if (wait_result == WAIT_TIMEOUT) {
        CloseHandle(process.hThread);
        CloseHandle(process.hProcess);
        return true;
    }

    DWORD exit_code = 1;
    GetExitCodeProcess(process.hProcess, &exit_code);

    CloseHandle(process.hThread);
    CloseHandle(process.hProcess);

    if (exit_code == 0) {
        return true;
    }

    const std::wstring message =
        L"Cari Studio no pudo iniciar el shell de desarrollo.\n\n"
        L"Revisa el log:\n" + log_path;

    MessageBoxW(
        nullptr,
        message.c_str(),
        L"Cari Studio",
        MB_OK | MB_ICONERROR);

    return false;
}

} // namespace

int WINAPI wWinMain(HINSTANCE, HINSTANCE, PWSTR, int) {
    const std::wstring root = module_directory();
    if (root.empty()) {
        MessageBoxW(
            nullptr,
            L"No se pudo determinar la carpeta del launcher.",
            L"Cari Studio",
            MB_OK | MB_ICONERROR);
        return 1;
    }

    const std::wstring installed = first_existing({
        env_value(L"CARI_STUDIO_EXECUTABLE"),
        join_path(
            join_path(env_value(L"LOCALAPPDATA"), L"Programs\\Cari Studio"),
            L"Cari Studio.exe"),
        join_path(
            join_path(env_value(L"ProgramFiles"), L"Cari Studio"),
            L"Cari Studio.exe"),
        join_path(
            join_path(env_value(L"ProgramFiles(x86)"), L"Cari Studio"),
            L"Cari Studio.exe"),
    });

    if (!installed.empty()) {
        return launch_executable(installed, parent_directory(installed))
            ? 0
            : 2;
    }

    if (launch_development_shell(root)) {
        return 0;
    }

    const std::wstring native = first_existing({
        join_path(
            root,
            L"experimental\\studio\\native-windows\\build-launch\\Release\\cari-studio-native.exe"),
        join_path(
            root,
            L"experimental\\studio\\native-windows\\build\\Release\\cari-studio-native.exe"),
        join_path(
            root,
            L"experimental\\studio\\native-windows\\build-validation\\Release\\cari-studio-native.exe"),
        join_path(
            root,
            L"experimental\\studio\\native\\cari-studio-native.exe"),
        join_path(
            root,
            L"experimental\\studio\\native\\CariStudio.exe"),
    });

    if (!native.empty()) {
        MessageBoxW(
            nullptr,
            L"No se encontró el shell Electron completo. Se iniciará el runtime nativo de diagnóstico.",
            L"Cari Studio",
            MB_OK | MB_ICONINFORMATION);

        return launch_executable(native, parent_directory(native)) ? 0 : 4;
    }

    MessageBoxW(
        nullptr,
        L"No se encontró una instalación ni un checkout ejecutable de Cari Studio.\n\n"
        L"Usa Cari-Setup.bat una vez para preparar la máquina Windows.",
        L"Cari Studio",
        MB_OK | MB_ICONERROR);

    return 5;
}
